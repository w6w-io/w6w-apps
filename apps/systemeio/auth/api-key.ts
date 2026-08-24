import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * systeme.io API key — `X-API-Key: <key>`.
 *
 * Verified against the vendor's own OpenAPI document
 * (`components.securitySchemes.Api_Key`, `{"type":"apiKey","in":"header","name":"X-API-Key"}`)
 * and the doc's prose: "your only option right now is to attach your API key to
 * the `X-API-Key` header of each request." There is no OAuth2 surface and no
 * bearer prefix — confirmed 2026-08-24.
 *
 * ## Keys are account-wide, not scoped
 *
 * Unlike Apify's scoped tokens, systeme.io documents no concept of a
 * permission-limited key: "generate a new key under the 'Public API keys'
 * section" is the entire setup story, and nothing in the spec restricts a key
 * to a subset of endpoints. That is *why* the probe below can be any cheap,
 * always-reachable read — there is no "narrowest legitimately-scoped call"
 * concern the way there is for Apify.
 *
 * ## Two distinct 401s, confirmed live on 2026-08-24 against `GET /api/contacts`
 *
 * - **No header at all**: `{"detail":"Full authentication is required to
 *   access this resource."}`, no `WWW-Authenticate` response header.
 * - **Header present but wrong**: `{"detail":"Invalid API Key."}`, PLUS a
 *   `WWW-Authenticate: API Key` response header the first case never carries.
 *
 * Both are genuine `application/problem+json` bodies — this app tells them
 * apart by `detail` text (with the header as a secondary signal) rather than
 * collapsing every 401 into one generic "check your credential" message.
 */

export interface SystemeCredential {
  apiKey: string;
}

/** The one place the header is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<SystemeCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /api/contact_fields`.
 *
 * Chosen over the obvious `GET /api/contacts` for one reason: it returns
 * nothing but the account's own custom-field *definitions* (`slug`,
 * `fieldName` — e.g. `"country"` / `"Country"`), never a contact's PII. A
 * health probe's result is stored and displayed, so the smaller and less
 * personal the body it reads, the better — and since keys carry no scoping at
 * all (see above), there is no "least-privileged reachable resource" tradeoff
 * to make; this is simply the cheapest real collection in the whole surface
 * (zero query parameters, typically a handful of rows).
 */
export const PROBE_PATH = "/api/contact_fields";

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a key from your systeme.io dashboard under Settings > Public API keys. Keys are " +
    "account-wide — systeme.io documents no per-key scoping.",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "systeme.io dashboard > Settings > Public API keys.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<SystemeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SystemeCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { detail?: string } | null;
    const detail = body?.detail;
    const wwwAuth = res.headers.get("www-authenticate");

    if (res.status === 401 && !wwwAuth) {
      return {
        ok: false,
        message:
          "systeme.io received no key. The credential did not reach the request — reconnect " +
          "this connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `systeme.io rejected the key${detail ? `: ${detail}` : ""}. Check it was ` +
          "copied exactly from Settings > Public API keys and has not been deleted.",
      };
    }
    return {
      ok: false,
      message: `systeme.io returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : ""
      }`,
    };
  },
};

export default apiKeyAuth;
