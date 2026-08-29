import type { AuthDefinition } from "@w6w/types";
import { API_BASE, parseBlandError } from "../lib/client.ts";

/**
 * Bland API key — `Authorization: <key>` (the raw key, no `Bearer ` prefix).
 *
 * See `lib/client.ts` finding 1 for why the raw form was chosen over the
 * `Bearer`-prefixed form that appears on a minority of doc pages: both are
 * accepted identically by a live, unauthenticated probe (both answer `401
 * AUTH_FAILURE` for a wrong key), and the raw form is what every example for
 * the core call/pathway/number/voice surface this app covers actually shows.
 *
 * Keys are minted in the Bland dashboard (Settings > API Keys). Bland
 * publishes no OAuth surface for this REST API, so an API key is the whole
 * authentication story.
 */

export interface BlandCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` never diverge. */
export function authHeaders(credential: Partial<BlandCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /v1/me`.
 *
 * Chosen by reading the response schema, not the endpoint's name — the trap
 * this pack has hit before (Follow Up Boss's `/me`, Mailjet's `/apikey`) is a
 * "whoami" that echoes the caller's own credential back. Bland's `/v1/me`
 * does not: its documented response is `{"status", "billing": {"current_balance",
 * "refill_to"}, "total_calls"}` — account metadata and a credit balance, never
 * the API key or another usable secret. It also genuinely requires a
 * credential (a missing/invalid key answers `401 AUTH_FAILURE`, verified
 * live), and it is the same read `health/quota.ts` uses for headroom, so a
 * live connection costs exactly one call per check interval, not two.
 */
export const PROBE_PATH = "/v1/me";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key from the Bland dashboard (Settings > API Keys).",
  apiKey: { in: "header", name: "authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Bland dashboard > Settings > API Keys.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<BlandCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BlandCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: "Bland rejected the API key (401 AUTH_FAILURE). Check it was copied exactly " +
          "from the dashboard's Settings > API Keys page and has not been revoked.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "Bland refused the request (403) — the account may be flagged for review. " +
          "Contact support@bland.ai if this persists.",
      };
    }
    return { ok: false, message: parseBlandError(res.status, "GET", PROBE_PATH, text) };
  },
};

export default apiKey;
