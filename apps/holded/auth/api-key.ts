import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Holded API key — sent as the raw value of a `key` header, not a `Bearer`
 * scheme and not a query parameter.
 *
 * Verified two ways on 2026-09-01: against the CRM API's OpenAPI document
 * (`components.securitySchemes.Auth`: `{"type":"apiKey","name":"key","in":
 * "header"}`) and live against `api.holded.com`:
 *
 * | Request                                    | Status | Body |
 * | ------------------------------------------- | ------ | ---- |
 * | `GET /api/crm/v1/funnels`, no `key` header  | 401    | `{"status":401}` |
 * | `GET /api/crm/v1/funnels`, `key: <bogus>`   | 400    | `{"status":0,"info":"Invalid key"}` |
 *
 * Holded's own account keys are generated per-account (Configuration > API in
 * the Holded app), not per-integration-scoped like Apify's, so there is no
 * narrower credential to recommend here — whatever key the user pastes carries
 * the account's full API access.
 *
 * ## The probe
 *
 * `GET /funnels` (List Funnels) was chosen over the vendor's own "Welcome"
 * page endpoints (there is no dedicated whoami/ping route documented anywhere
 * in the CRM, Invoicing, Projects, Team or Accounting OpenAPI documents) for
 * three reasons: it requires no path parameter, it is a plain read with no
 * side effect, and its response is a list of the account's own sales funnels —
 * configuration data, not anything resembling a live credential. An account
 * with zero funnels still answers `200 []`, which is a normal, healthy
 * response, not an error.
 */
export interface HoldedCredential {
  apiKey: string;
}

/** Exported so `test` builds the header the same way `sign` does. */
export function authHeaders(credential: Partial<HoldedCredential>): Record<string, string> {
  return { key: credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Holded > Configuration (top bar) > API. The key carries the full " +
    "access of the Holded account it belongs to.",
  apiKey: { in: "header", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Holded app > Configuration > API. There is no per-integration scoping — this key " +
        "can read and write everything the account can.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<HoldedCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<HoldedCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/funnels`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { status?: number; info?: string } | null;

    if (res.status === 401 && body?.info === undefined) {
      return {
        ok: false,
        message: "Holded received no key. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (body?.info) {
      return {
        ok: false,
        message: `Holded rejected the key (${res.status}): ${body.info}`,
      };
    }
    return { ok: false, message: `Holded returned HTTP ${res.status} for GET /funnels` };
  },
};

export default apiKey;
