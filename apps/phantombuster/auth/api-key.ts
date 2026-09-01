import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * PhantomBuster API key — `X-Phantombuster-Key: <key>`.
 *
 * Verified against PhantomBuster's v2 OpenAPI document
 * (`components.securitySchemes`, fetched 2026-09-01) and live probes against
 * `api.phantombuster.com` the same day. See `lib/client.ts` for why this is
 * NOT the header name (`X-Phantombuster-Key-1`) the vendor's own prose "API"
 * guide currently documents — that guide describes the legacy v1 surface.
 *
 * ## Query-string alternative, not used here
 *
 * The vendor also accepts the key as a `?key=` query parameter. This app only
 * ever uses the header: a workflow host logs request URLs, not headers, and
 * the vendor's own v1 guidance ("URLs are often stored in browser history and
 * server logs") applies here too.
 *
 * ## Optional org id
 *
 * Nearly every v2 endpoint accepts an optional `X-Phantombuster-Org` header:
 * "ID of the org that is performing the operation (not necessary when using a
 * third party key)". A personal API key already belongs to one org, so this is
 * only needed for a key that can act across several. It is not a secret, so it
 * is collected as a plain `string` field rather than `secret`.
 */

export interface PhantomBusterCredential {
  apiKey: string;
  orgId?: string;
}

/** The one place the wire format is built — `test` exercises the same code `sign` does. */
export function authHeaders(credential: Partial<PhantomBusterCredential>): Record<string, string> {
  const headers: Record<string, string> = { "x-phantombuster-key": credential.apiKey ?? "" };
  if (credential.orgId) headers["x-phantombuster-org"] = credential.orgId;
  return headers;
}

/**
 * The credential-liveness probe: `GET /orgs/fetch-resources`.
 *
 * Chosen the same way Apify's `/v2/users/me/limits` was chosen in this pack —
 * by reading the response schema, not the name:
 *
 * **(a) It requires a credential.** Live-verified 2026-09-01: no key or an
 * empty key answers `401 {"status":"error","error":"Missing session cookie or
 * API key …"}`; a syntactically plausible but wrong key answers
 * `401 {"status":"error","error":"API key not found"}`.
 *
 * **(b) It returns no credential material.** Its schema is exactly daily/
 * monthly usage counters, storage, agent count and plan metadata — nothing
 * else. Compare `GET /orgs/fetch`, which unconditionally returns
 * `identityTokens` (live magic-link tokens), or `GET /users/fetch-me`, which
 * is NOT used here at all (see `WHY_NOT_USERS_FETCH_ME`).
 *
 * **(c) It doubles as the quota check's own data source** — see
 * `health/quota.ts`, which reads the exact same response.
 */
export const PROBE_PATH = "/orgs/fetch-resources";

/**
 * Why the obvious whoami is not the probe (or an action at all), kept as an
 * exported constant so the reason survives the next person who reaches for it.
 *
 * `GET /users/fetch-me` is marked `security: []` in the vendor's own OpenAPI
 * document — an override no other endpoint in this app's surface carries —
 * and its documented behaviour is "If a sessionId is not provided the endpoint
 * will create a new session and return the newly created id": a GET with a
 * side effect, whose behaviour for a plain API-key caller (versus the
 * session-cookie flow the w6b app itself uses) is not specified. Its response
 * additionally includes `sessionId` and `zendeskToken` — both live session
 * credentials — unconditionally. A health probe's response is stored and
 * displayed on every check; this app declines to make that call at all rather
 * than mint (and expose) a session on a timer. Follow Up Boss's `/me` and
 * Mailjet's `/apikey` are the same trap, already avoided pack-wide.
 */
export const WHY_NOT_USERS_FETCH_ME =
  "GET /users/fetch-me is security:[] in the vendor's own spec, may mint a new session as a " +
  "side effect of a GET, and unconditionally returns sessionId + zendeskToken";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from PhantomBuster > your avatar > Settings ('API key' section). If your " +
    "key can act across more than one organization, also set the Organization ID.",
  apiKey: { in: "header", name: "X-Phantombuster-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "PhantomBuster > your avatar (top right) > Settings. The key is shown once; regenerate " +
        "it there if lost or compromised.",
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      hint: "Only needed when this key can act on more than one organization. Leave empty for an " +
        "ordinary personal API key.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header(s) and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PhantomBusterCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and {@link WHY_NOT_USERS_FETCH_ME} for why not the whoami. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PhantomBusterCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key, orgId: cred.orgId }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { error?: string } | null;
    const message = body?.error;

    if (res.status === 401) {
      return {
        ok: false,
        message: message
          ? `PhantomBuster rejected the key (401): ${message}`
          : "PhantomBuster returned 401 for the account-resources read.",
      };
    }
    return {
      ok: false,
      message: `PhantomBuster returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiKey;
