import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Browse AI API key — `Authorization: Bearer <key>`.
 *
 * Verified against Browse AI's OpenAPI 3.1 document (`components.securitySchemes.bearerAuth`,
 * fetched 2026-08-24 — "Your Browse AI API key, sent as a Bearer token") and live probes against
 * `api.browse.ai` on the same day. There is exactly one auth scheme: no OAuth2 surface, no query
 * parameter form, no per-endpoint scoping. The key is generated at
 * https://dashboard.browse.ai/api and is a property of a **team**, not an individual robot — a
 * single key reaches every robot the team owns.
 *
 * ## Finding: missing and invalid both answer identically
 *
 * Unlike Apify's `token-not-provided` vs `user-or-token-not-found`, Browse AI's own
 * `UnauthorizedResponse` schema declares only two `messageCode` values —
 * `unauthorized` and `no_api_access` — and live probes on 2026-08-24 confirm the API collapses
 * every credential-shaped failure into the first one: no `Authorization` header, an empty
 * `Bearer `, a syntactically plausible fake key, and a `Basic` scheme all answered the exact same
 * `401 {"statusCode":401,"messageCode":"unauthorized"}` (47 bytes). There is no way for {@link test}
 * to tell a caller "your key never reached the request" apart from "your key is wrong or revoked" —
 * both get the same message. `no_api_access` is the one case worth calling out separately: the
 * vendor's own schema documents it for a team whose plan does not include API access, a
 * remediation (upgrade the plan) that re-copying the key cannot fix.
 *
 * ## Probe: `GET /v2/status`, not a resource endpoint
 *
 * Chosen by reading the schema and by measuring the wire on 2026-08-24, not by convenience:
 *
 * **(a) It requires a credential.** Every other read in this API does too, but this one was
 * checked explicitly because its OpenAPI operation carries no per-endpoint `security` override and
 * its own description calls it an "infrastructure status" check — the kind of endpoint vendors
 * often leave public. Browse AI does not: unauthenticated, it answers the same
 * `401 unauthorized` as every other route.
 *
 * **(b) It returns no business or account data at all.** Its schema is
 * `{statusCode, messageCode, tasksQueueStatus: "OK" | "UNDER_MAINTENANCE"}` — a description of
 * Browse AI's own task queue, not of the caller's team. Compare this to the tempting alternative,
 * `GET /v2/robots`: it works too, but its response is real business data (the team's robot names
 * and ids), which is more than a liveness probe needs to read or store.
 *
 * **(c) It needs no team-level access beyond a live key.** There is no per-resource scoping in this
 * API (see the module doc), so nothing here is a "some keys can't reach this" trap the way Apify's
 * resource-scoped tokens are — but reading the smallest possible surface is still the right default
 * for a probe that runs on every health check tick.
 */

export interface BrowseAiCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same code path `sign`
 * does — a hand-rolled second copy is how a probe ends up sending a header the real requests do
 * not.
 */
export function authHeaders(credential: Partial<BrowseAiCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module doc for why `/v2/status` and not `/v2/robots` or `/v2/teams`. */
export const PROBE_PATH = "/status";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste your team's API key from dashboard.browse.ai > API. The key reaches every robot the " +
    "team owns; Browse AI has no per-robot or per-scope key.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "dashboard.browse.ai > API. Generate a key there if you don't already have one.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The key never appears in a URL —
   * Browse AI documents no query-parameter form to accidentally reach for.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<BrowseAiCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module doc for why this endpoint, and why missing/invalid read the same. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BrowseAiCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { messageCode?: string } | null;
    const code = body?.messageCode;

    if (code === "no_api_access") {
      return {
        ok: false,
        message:
          "Browse AI accepted the key but this team's plan does not include API access. Upgrade " +
          "the plan on dashboard.browse.ai — re-copying the key will not fix this.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Browse AI rejected the request (401${code ? ` ${code}` : ""}). Browse AI's API does ` +
          "not distinguish a missing key from a wrong one in its response, so check the key was " +
          "copied in full from dashboard.browse.ai > API and has not been regenerated.",
      };
    }
    return { ok: false, message: `Browse AI returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;
