import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Devin API key — `Authorization: Bearer <token>`, plus the organization the
 * token operates in.
 *
 * Verified against `docs.devin.ai/api-reference/authentication` (fetched
 * 2026-09-05) and live probes against `api.devin.ai` the same day.
 *
 * ## `cog_`-prefixed, either principal
 *
 * v3 accepts two kinds of credential, both `cog_`-prefixed and both presented
 * identically as `Authorization: Bearer cog_...`:
 *
 *  - a **Service User API Key** — a non-human identity created under
 *    Settings → Service Users, recommended for automation; or
 *  - a **Personal Access Token** — a human user's own token, acting as them.
 *
 * The wire format does not distinguish them, so this app collects one `apiKey`
 * field rather than two, and lets the field's own hint explain the choice.
 * Legacy `apk_`/`apk_user_`-prefixed keys (the v1/v2 API) are NOT accepted
 * here — see `lib/client.ts` for why this app targets v3 at all.
 *
 * ## The organization id is collected here, not per-action
 *
 * Every v3 endpoint below `/v3/organizations/{org_id}/...` needs one, and a
 * service user (or a PAT's chosen org for this Connection) is provisioned
 * into exactly the orgs it can act in — so, like Freshdesk's account
 * subdomain, the org id identifies the account and belongs to the Connection,
 * not to each Action's params. `afterConnect` echoes it onto the connection's
 * display data; `lib/client.ts` reads it back from there.
 */

export interface DevinCredential {
  apiKey: string;
  orgId: string;
}

/** The one place the wire format is built, so `test`/`afterConnect`/`sign` never drift apart. */
export function authHeaders(credential: Partial<DevinCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * `ServiceUserSelf | PatUserSelf | DevinBrainUserSelf` — the tagged union
 * `GET /v3/self` answers, keyed by `principal_type`. Only the fields this app
 * reads are declared.
 */
interface SelfResponse {
  principal_type?: string;
  service_user_name?: string;
  user_name?: string;
  org_id?: string | null;
}

/**
 * The credential-liveness probe: `GET /v3/self`.
 *
 * Chosen by reading the documented permission model, not by shortest path:
 * `ReadAccountMeta`, the permission it requires, is "granted to all service
 * users by default" per `docs.devin.ai/api-reference/v3/overview` — so it is
 * reachable by the most narrowly-scoped service user this app can be handed,
 * unlike every session/secret/attachment endpoint, which needs a specific
 * `UseDevinSessions`/`ManageOrgSessions`/`ManageOrgSecrets`-shaped permission a
 * legitimately narrow token may lack. It also needs no `org_id` in its path at
 * all (`/v3/self`, not `/v3/organizations/{org_id}/self`), so it can catch a
 * bad token before ever touching the organization id the user typed.
 *
 * Live-verified on 2026-09-05: unauthenticated and with a syntactically
 * plausible fake token, both return
 * `{"type":"about:blank","title":"Forbidden","status":403,"detail":"Unauthorized","instance":"/v3/self"}`
 * — a real, schema-shaped RFC 9457 refusal, not a generic gateway error.
 */
async function probeSelf(
  apiKey: string,
  ctx: HookContext,
): Promise<{ ok: true; self: SelfResponse } | { ok: false; message: string }> {
  const res = await ctx.fetch(`${API_BASE}/v3/self`, {
    headers: { accept: "application/json", ...authHeaders({ apiKey }) },
  });
  if (res.ok) {
    const self = await res.json().catch(() => ({})) as SelfResponse;
    return { ok: true, self };
  }

  const body = await res.json().catch(() => null) as { title?: string; detail?: string } | null;
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      message: `Devin rejected the API key (${res.status}${body?.title ? ` ${body.title}` : ""})` +
        `. Check it was copied exactly from Settings > Service Users and has not been revoked.`,
    };
  }
  return {
    ok: false,
    message: `Devin returned HTTP ${res.status} for /v3/self${
      body?.detail ? `: ${body.detail}` : ""
    }`,
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste a Service User API Key (Settings > Service Users — recommended for automation) or a " +
    "Personal Access Token, plus the organization id it operates in.",
  connectionLabel: "Devin ({{orgId}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "A cog_-prefixed Service User API Key or Personal Access Token. Settings > Service " +
        "Users to create one.",
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      required: true,
      placeholder: "org-abc123def456",
      hint: "The org- prefixed id this key operates in. Find it on the Settings > Service Users " +
        "page.",
      validation: { pattern: "^org-" },
    },
  ],

  /** The only hook handed the raw credential. Network-less: it stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<DevinCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link probeSelf} for why `/v3/self` and not a session/organization endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<DevinCredential>;
    const token = (cred?.apiKey ?? "").trim();
    const orgId = (cred?.orgId ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };
    if (!orgId) return { ok: false, message: "credential missing orgId" };

    const result = await probeSelf(token, ctx);
    if (!result.ok) return result;

    // A service user carries the one org it belongs to in `org_id`; a
    // mismatch here means every session/secret/attachment call below would
    // 403 or 404 against the org the user typed. A PAT (or an enterprise
    // service user spanning several orgs) reports `org_id: null` and is left
    // unchecked — it is not scoped to a single org, so there is nothing to
    // compare against.
    if (result.self.org_id && result.self.org_id !== orgId) {
      return {
        ok: false,
        message:
          `This API key is scoped to organization ${result.self.org_id}, not ${orgId}. Update ` +
          "the Organization ID field to match, or use a key created in that organization.",
      };
    }
    return { ok: true };
  },

  /**
   * Publish the organization id (needed by every Action — see `lib/client.ts`)
   * and, when available, the principal's own display name.
   *
   * A failure here is deliberately silent beyond the org id: `test` has
   * already established the key is live, and a missing display name must not
   * fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<DevinCredential>;
    const orgId = (cred?.orgId ?? "").trim();
    try {
      const result = await probeSelf(cred?.apiKey ?? "", ctx);
      if (!result.ok) return { orgId };
      const name = result.self.service_user_name ?? result.self.user_name;
      return name ? { orgId, principalName: name } : { orgId };
    } catch {
      return { orgId };
    }
  },
};

export default apiKey;
