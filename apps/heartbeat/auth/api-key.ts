import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatHeartbeatError } from "../lib/client.ts";

/**
 * Heartbeat API key — `Authorization: Bearer <API_KEY>`.
 *
 * Verified against the "Authentication" reference page (`bearerAuth`,
 * `scheme: bearer`, `bearerFormat: APIKEY` in the OpenAPI document) and a live
 * probe against `api.heartbeat.chat` on 2026-09-05. There is exactly one auth
 * scheme — Heartbeat publishes no OAuth surface for third-party apps, and
 * every request (including reads) requires the header.
 *
 * ## The probe: `GET /v0/roles`
 *
 * Heartbeat documents no dedicated ping/whoami endpoint at all, so this picks
 * the cheapest authenticated read with no required parameters and no
 * meaningful side data to leak:
 *
 *  - `GET /v0/users` is the obvious whoami-adjacent alternative, but it
 *    returns every member's full profile (email, bio, LinkedIn history,
 *    onboarding answers) — a health probe's response is stored and displayed,
 *    and copying a community's whole member list into it on every check is
 *    exactly the kind of quiet leak this pack refuses elsewhere (Apify's
 *    proxy password, Follow Up Boss's `/me`).
 *  - `GET /v0/find/users` and `GET /v0/notifications` both require a query
 *    parameter this probe has no reason to know (a specific email), so they
 *    cannot run unattended.
 *  - `GET /v0/roles` needs the credential (measured: unauthenticated and
 *    bad-key requests both answer `401`), takes no parameters, and returns
 *    only `{id, name}` pairs — role names a community's own admin chose
 *    (`Moderator`, `Member`), never a person's data.
 *
 * ## Both a missing and an invalid key answer the same body
 *
 * Measured live against `api.heartbeat.chat/v0/users`: no `Authorization`
 * header and a syntactically-plausible bogus token both come back
 * `401 {"error":true,"message":"Invalid API Key"}`. There is no second,
 * more-specific code to branch on — unlike Apify's `token-not-provided` vs
 * `user-or-token-not-found` — so this reports the single message Heartbeat
 * actually sends rather than inventing a distinction the vendor does not draw.
 */

export interface HeartbeatCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does.
 */
export function authHeaders(credential: Partial<HeartbeatCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module docs for why this endpoint and not `/users` or `/find/users`. */
export const PROBE_PATH = "/roles";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from your Heartbeat community's admin settings. Every request — including " +
    "reads — requires this header; Heartbeat has no unauthenticated endpoints and no OAuth flow " +
    "for third-party apps.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From your community's admin dashboard. Heartbeat scopes one key per community, not " +
        "per user.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HeartbeatCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HeartbeatCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const url = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;
    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const detail = await res.text().catch(() => "");
    return { ok: false, message: formatHeartbeatError(res.status, "GET", PROBE_PATH, detail) };
  },
};

export default apiKey;
