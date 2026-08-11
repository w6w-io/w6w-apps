import type { HookContext } from "@w6w/types";
import { API_ORIGIN, keapErrorCode, V2 } from "../lib/client.ts";

/**
 * The credential-liveness probe, shared by both auth methods.
 *
 * Keap has exactly one OAuth scope — `full` — so the usual "does this
 * credential have the scope for the probe?" question does not arise from OAuth.
 * It arises from the *other* credential type: a Personal Access Token runs
 * "under the user context of the user creating it, with that user's visibility
 * and editing permissions" (Keap's own wording), so a PAT belonging to a
 * restricted user can legitimately be refused a contact read while still being
 * a perfectly live credential. That rules out the obvious probes
 * (`GET /contacts?page_size=1`, `GET /tags?page_size=1`).
 *
 * `GET /crm/rest/v2/oauth/connect/userinfo` is what remains, and it was chosen
 * by reading its response schema and measuring the wire on 2026-08-11:
 *
 * **(a) It requires a credential.** Unauthenticated it answers 401. There is no
 * endpoint on this API that does not — see {@link WHY_STATUS_CODE_IS_NOT_ENOUGH}
 * — so the risk that a Connection whose token never attached sails through the
 * probe (ElevenLabs `/v1/voices`, Apify `/v2/store`) does not exist here.
 *
 * **(b) It is about the caller, not about data.** `GetUserInfoResponse` is the
 * OIDC-shaped `{email, sub, id, keap_id, family_name, given_name, middle_name,
 * preferred_name, is_admin, tenant_id}`. No object permission can withhold it.
 *
 * **(c) It returns no credential material.** Every field above is identity, not
 * secret. It carries no API key, no token and no client secret — unlike
 * Mailjet's `/apikey`, Follow Up Boss's `/me` and ElevenLabs' `/v1/user`, which
 * all hand the caller's own credential back and are banned pack-wide.
 */
export const PROBE_PATH = `${V2}/oauth/connect/userinfo`;

/**
 * Why this probe classifies from the response BODY and never from the status
 * code — kept as an exported constant so the reason survives the next person
 * who notices `res.status === 401` would be shorter.
 *
 * Keap answers **401 for four different situations that need four different
 * fixes**, and three of them are byte-identical at the status line. Measured
 * against `api.infusionsoft.com` on 2026-08-11:
 *
 * | Request                                  | Status | `fault.detail.errorcode`                     |
 * | ---------------------------------------- | ------ | -------------------------------------------- |
 * | no Authorization header                  | 401    | `oauth.v2.InvalidAccessToken`                |
 * | `Authorization: not-a-real-token`        | 401    | `oauth.v2.InvalidAccessToken`                |
 * | `Authorization: Bearer <garbage>`        | 401    | `keymanagement.service.invalid_access_token` |
 * | a path that does not exist, unauthed     | 401    | `oauth.v2.InvalidAccessToken`                |
 *
 * The first two mean *no credential reached Keap* — reconnect, because the
 * problem is upstream of the token. The third means *a token was presented and
 * Keap rejected it* — the token is wrong, expired or revoked. Reporting either
 * as the other sends the user to the wrong screen. And the fourth is why an
 * unauthenticated 404-check proves nothing on this API: the Apigee gateway
 * authenticates before it routes, so a nonsense path answers 401 too.
 */
export const WHY_STATUS_CODE_IS_NOT_ENOUGH =
  "Keap answers 401 with oauth.v2.InvalidAccessToken when no credential arrived and " +
  "keymanagement.service.invalid_access_token when one arrived and was rejected";

export interface UserInfo {
  email?: string;
  sub?: string;
  id?: string;
  keap_id?: string;
  family_name?: string;
  given_name?: string;
  middle_name?: string;
  preferred_name?: string;
  is_admin?: boolean;
  tenant_id?: string;
}

/**
 * Run the probe with an explicitly supplied header set.
 *
 * `test` runs before a Connection exists, so the runtime cannot route it
 * through `sign`; each auth method passes the header it would have signed with.
 * That header is built by the method's own exported `authHeaders`, so the probe
 * exercises the same wire format the real requests use — a hand-rolled second
 * copy is how a probe ends up proving something about a header nothing else
 * sends.
 */
export async function probeCredential(
  headers: Record<string, string>,
  ctx: HookContext,
  vendorLabel: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await ctx.fetch(`${API_ORIGIN}${PROBE_PATH}`, {
    headers: { accept: "application/json", ...headers },
  });
  if (res.ok) return { ok: true };

  const raw = await res.text().catch(() => "");
  const code = keapErrorCode(raw);

  if (code === "oauth.v2.InvalidAccessToken") {
    return {
      ok: false,
      message:
        "Keap received no usable credential — the request reached the gateway without a bearer " +
        `token. Reconnect this ${vendorLabel} connection; the problem is upstream of the token ` +
        "itself.",
    };
  }
  if (code && code.startsWith("keymanagement.service.")) {
    return {
      ok: false,
      message:
        `Keap rejected the credential (${res.status} ${code}). It is wrong, expired or has been ` +
        "revoked in the Keap app's API Settings.",
    };
  }
  if (res.status === 403) {
    return {
      ok: false,
      message: `Keap refused the identity read (403${code ? ` ${code}` : ""}). The credential is ` +
        "recognised but not permitted to read its own user info.",
    };
  }
  if (res.status === 429) {
    // Says nothing about the credential either way, and `test` has no third
    // state, so it fails loudly rather than passing a token it never verified.
    return {
      ok: false,
      message:
        `Keap throttled the check (429${code ? ` ${code}` : ""}). This is not a statement about ` +
        "the credential — retry in a minute.",
    };
  }
  return {
    ok: false,
    message: `Keap returned HTTP ${res.status}${code ? ` ${code}` : ""} for the identity read`,
  };
}

/**
 * Fetch the connection's display identity.
 *
 * Deliberately silent on failure: `test` has already established the credential
 * is live, and a missing label must never fail a good Connection.
 */
export async function fetchUserInfo(
  headers: Record<string, string>,
  ctx: HookContext,
): Promise<Record<string, unknown>> {
  try {
    const res = await ctx.fetch(`${API_ORIGIN}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...headers },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as UserInfo | null;
    if (!body) return {};
    const name = [body.given_name, body.family_name].filter(Boolean).join(" ").trim();
    return compactDisplay({
      email: body.email,
      name: name || body.preferred_name || body.email,
      tenantId: body.tenant_id,
      userId: body.id,
      isAdmin: body.is_admin,
    });
  } catch {
    return {};
  }
}

function compactDisplay(display: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(display)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}
