import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatMercuryError } from "../lib/client.ts";

/**
 * Mercury bearer token — `Authorization: Bearer <token>`.
 *
 * Verified against `components.securitySchemes.bearerAuth` in Mercury's own
 * OpenAPI document (see `lib/client.ts`), fetched 2026-09-05:
 *
 *     "bearerAuth": {
 *       "scheme": "bearer",
 *       "type": "http",
 *       "description": "Bearer token authentication for Mercury API.\n\n
 *         Use your API token in the Authorization header:
 *         `Authorization: Bearer TOKEN`\n\nExample:
 *         `Authorization: Bearer secret-token:mercury_production_wma_...`\n\n
 *         Your Mercury API token should include the 'secret-token:' prefix.
 *         Tokens can be generated from your Mercury dashboard settings.\n"
 *     }
 *
 * The vendor's own worked example bakes a literal `secret-token:` prefix INTO
 * the token value itself (not a separate scheme keyword) — the field below
 * stores whatever the user pastes from their dashboard verbatim, prefix
 * included, and the `sign` hook does not try to add or strip it.
 *
 * ## The probe is `GET /categories`, chosen to avoid ever echoing account data
 *
 * A banking API's own read endpoints can hand back real balances, EINs, and
 * legal business names — echoing any of that back through a credential-health
 * probe would be a worse leak than usual for this vendor. `/categories`
 * returns only the organization's custom expense-category labels (e.g.
 * "Software", "Payroll") — no balance, account, or PII field exists in its
 * response schema — while still requiring a valid bearer to reach at all:
 * verified live 2026-09-05, a garbage bearer against `/categories` answers
 * the identical `401 noTokenInDB` a garbage bearer gets against `/accounts`,
 * so the probe proves the credential exactly as well as a sensitive endpoint
 * would, without the sensitive response body.
 *
 * `GET /organization` (EIN + legal name) and `GET /accounts` (live balances)
 * were both considered and rejected for exactly this reason.
 */

export interface MercuryCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared with `test` so no second copy can drift. */
export function authHeaders(credential: Partial<MercuryCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/** See the module doc for why this endpoint and not a whoami/account read. */
export const PROBE_PATH = "/categories?limit=1";

interface MercuryAuthErrorBody {
  errors?: { errorCode?: string; message?: string };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a personal or organization API token from your Mercury dashboard (Settings > API tokens). " +
    "Mercury issues the token WITH the `secret-token:` prefix already included — paste it exactly as " +
    "shown, prefix and all.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "Mercury dashboard > Settings > API tokens. Include the full value Mercury shows you, " +
        "including its `secret-token:` prefix.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<MercuryCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MercuryCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let errorCode: string | undefined;
    try {
      errorCode = (JSON.parse(raw) as MercuryAuthErrorBody).errors?.errorCode;
    } catch { /* not JSON */ }

    if (errorCode === "noAuthTokenHeader") {
      return {
        ok: false,
        message:
          "Mercury received no Authorization header. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (errorCode === "noTokenInDB" || res.status === 401) {
      return {
        ok: false,
        message: `Mercury rejected the token (${res.status}${errorCode ? ` ${errorCode}` : ""}). ` +
          "Check it was copied exactly, including the `secret-token:` prefix, and has not been " +
          "revoked from the Mercury dashboard.",
      };
    }
    return { ok: false, message: formatMercuryError(res.status, "GET", PROBE_PATH, raw) };
  },
};

export default apiToken;
