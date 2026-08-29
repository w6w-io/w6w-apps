import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Apollo API key — `x-api-key` header.
 *
 * Verified against `docs.apollo.io/reference/authentication` and live probes against
 * `api.apollo.io` on 2026-08-29.
 *
 * ## The header, confirmed by name
 *
 * Apollo's authentication page states it plainly: "Pass the key in the `x-api-key`
 * header of every request." This is the ONLY method this app offers — Apollo also
 * documents an OAuth 2.0 flow, but that is for **partners** acting on behalf of a
 * mutual Apollo user (an integration Apollo itself lists in its Marketplace), not for a
 * workspace connecting its own account, so it has no place in a Connection here.
 *
 * ## The probe: `GET /users/api_profile`, not the undocumented `auth/health`
 *
 * Apollo's own auth docs show a curl example against `GET /auth/health` — but that
 * endpoint is not in the OpenAPI reference (it is absent from all 74 documented paths)
 * and, measured live on 2026-08-29, answers `200 {"healthy":true,"is_logged_in":false}`
 * for THREE different inputs: no key, a syntactically-plausible fake key, and (per the
 * docs' own text) presumably a real key too — a status-code-only read of it cannot tell
 * a live Connection from a dead one, and per this pack's rule that is disqualifying on
 * its own.
 *
 * `GET /users/api_profile` is used instead:
 *
 *  - **Requires a credential.** No key → `422 {"error":"Api key required"}`; a wrong key
 *    → `401` with a plain-text body (see `lib/client.ts` for the shape). Both confirmed
 *    live.
 *  - **Needs no special scope.** It is the one endpoint the auth guide singles out as
 *    granted "automatically on every OAuth token" — the API-key equivalent is that any
 *    key can call it, unlike `GET /users/search`, which the same guide says needs a
 *    Master key.
 *  - **Leaks nothing.** Its documented response is `{id, team_id, first_name, last_name,
 *    title, email}` — the caller's own name and email, not a credential. (Apollo's
 *    Mailjet-`/apikey`-shaped trap would be `include_credit_usage=true` on this same
 *    endpoint, which folds in the team's credit balances — this probe never sets it.)
 */

export interface ApolloCredential {
  apiKey: string;
}

/** The one place the header is built, so `sign` and `test` share it exactly. */
export function authHeaders(credential: Partial<ApolloCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/** `GET /v1/users/api_profile` — see the module doc for why this and not `auth/health`. */
export const PROBE_PATH = "/users/api_profile";

interface ProfileBody {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Apollo > Settings > Integrations > API. Some endpoints (listing " +
    "workspace users) require a Master API key; everything else works with a scoped key.",
  connectionLabel: "Apollo ({{email}})",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Apollo > Settings > Integrations > API. Create a key dedicated to this connection.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: it stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<ApolloCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ApolloCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text().catch(() => "");

    if (res.status === 422) {
      return {
        ok: false,
        message: "Apollo received no key. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (res.status === 401) {
      const detail = contentType.includes("json")
        ? (() => {
          try {
            return (JSON.parse(raw) as { error?: string }).error;
          } catch {
            return undefined;
          }
        })()
        : raw.trim();
      return {
        ok: false,
        message: `Apollo rejected the key (401)${detail ? `: ${detail}` : ""}. Check it was ` +
          "copied exactly and has not been deactivated in Apollo > Settings > Integrations > API.",
      };
    }
    return { ok: false, message: `Apollo returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the account holder's name and email for the Connection label, and nothing
   * else — `include_credit_usage` is never set, so the team's credit balances never
   * enter this hook. A failure here is silent: `test` already established the key is
   * live, and a missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ApolloCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as ProfileBody;
      if (!body?.email) return {};
      const name = [body.first_name, body.last_name].filter(Boolean).join(" ");
      return { email: body.email, name: name || undefined, userId: body.id };
    } catch {
      return {};
    }
  },
};

export default apiKey;
