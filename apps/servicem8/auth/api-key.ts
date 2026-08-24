import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * ServiceM8 API Key — `X-Api-Key: <key>`.
 *
 * Verified against `components.securitySchemes.apiKey` in the vendor's own
 * OpenAPI document (`{"type":"apiKey","name":"X-Api-Key","in":"header"}`) and
 * against `docs/authentication.md`'s worked curl example, both fetched
 * 2026-08-24, plus live probes of `api.servicem8.com` the same day.
 *
 * ## No scopes for an API key — only OAuth2 is scoped
 *
 * ServiceM8 documents ~50 fine-grained OAuth scopes (`read_jobs`,
 * `manage_customers`, …), but `security` on every single operation in the
 * reference lists them as an *alternative* to the bare `apiKey` scheme with an
 * EMPTY scope list. An API key is all-or-nothing: it reaches every endpoint
 * this app calls with no way to narrow it, unlike the OAuth2 path (documented
 * in `docs/authentication.md`, not implemented by this app — see the app-level
 * doc comment in `index.ts` for why).
 *
 * ## The 401 body only exists once a key is actually sent
 *
 * Measured live, 2026-08-24, four requests to `GET /vendor.json`:
 *
 *   | Request                              | Status | Content-Type | Body |
 *   | ------------------------------------- | ------ | ------------- | ---- |
 *   | no header at all                      | 401    | text/html     | `Authorization Required` (plain text) |
 *   | `X-Api-Key: <garbage>`                | 401    | application/json | `{"errorCode":401,"message":"Authorization Required"}` |
 *   | `X-Api-Key: <another garbage>`        | 401    | application/json | `{"errorCode":401,"message":"Authorization Required"}` |
 *   | `Authorization: Basic <garbage>`      | 401    | text/html     | `Invalid username or password` |
 *
 * Every key this app ever sends goes through {@link sign}, which always sets
 * the header — so in practice this app never hits the plain-text "no header"
 * shape, only the JSON one. But that JSON message is identical for a garbage
 * key and (per the vendor's own docs) a revoked one, so `test` cannot tell
 * "never valid" from "was valid, now isn't" apart, and says so rather than
 * guessing.
 */

export interface ServiceM8ApiKeyCredential {
  apiKey: string;
}

/** The one place the wire format is built, reused by `sign`, `test` and `afterConnect`. */
export function authHeaders(
  credential: Partial<ServiceM8ApiKeyCredential>,
): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /vendor.json`.
 *
 * **(a) It requires a credential** — see the measured table above; unsigned it
 * is a 401 on every path tried, including this one.
 *
 * **(b) An API key can always reach it.** `security` on `listVendors` is
 * `[{apiKey: []}, {oauth2: ["vendor"]}]` — the bare API-key scheme, no scope
 * required — so unlike an OAuth-scoped credential, there is no way for a live
 * API key to be refused here for lacking a permission.
 *
 * **(c) It returns no credential material.** `Vendor` is the account's own
 * business profile — name, email, billing address, currency, business hours,
 * ABN/business number, invoice terms — with no API key, token, or password
 * field anywhere in the schema. That is not automatic for a whoami: several
 * vendors' own "who am I" endpoints hand back the caller's own live secret.
 */
export const PROBE_PATH = "/vendor.json";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "ServiceM8 > Settings > API Keys. Sent as the X-Api-Key header on every request. Grants " +
    "full access with no scopes — see the description on this method for what that means " +
    "compared to a scoped OAuth2 connection.",
  apiKey: { in: "header", name: "X-Api-Key" },
  connectionLabel: "{{name}} ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "ServiceM8 web app -> Settings -> API Keys. No ServiceM8 Developer account needed.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. ServiceM8 documents no query-parameter
   * form for the key.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ServiceM8ApiKeyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ServiceM8ApiKeyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    if (res.ok) {
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch { /* fall through */ }
      if (!Array.isArray(body)) {
        return { ok: false, message: `ServiceM8 returned an unexpected body for ${PROBE_PATH}` };
      }
      return { ok: true };
    }

    let parsed: { errorCode?: number; message?: string } | null = null;
    try {
      parsed = JSON.parse(text) as { errorCode?: number; message?: string };
    } catch { /* plain-text body — handled by the generic message below */ }
    const detail = parsed?.message ? `: ${parsed.message}` : text ? `: ${text}` : "";

    if (res.status === 401) {
      return {
        ok: false,
        message: `ServiceM8 answered 401${detail}. This message is identical for a key that ` +
          "never existed and one that has been revoked, so check the key was copied exactly from " +
          "Settings -> API Keys and has not been deleted there.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          `ServiceM8 rate-limited this request (429${detail}). The key may still be valid — ` +
          "retry after the per-minute/per-day window resets.",
      };
    }
    return {
      ok: false,
      message: `ServiceM8 returned HTTP ${res.status} for ${PROBE_PATH}${detail}`,
    };
  },

  /**
   * Publish the account's name and email, nothing else. `afterConnect` runs
   * only once `test` has already established the key is live, and a missing
   * label must not fail an otherwise-good Connection, so any failure here is
   * silent.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ServiceM8ApiKeyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as Array<{ name?: string; email?: string }>;
      const vendor = Array.isArray(body) ? body[0] : undefined;
      if (!vendor?.name) return {};
      return vendor.email ? { name: vendor.name, email: vendor.email } : { name: vendor.name };
    } catch {
      return {};
    }
  },
};

export default apiKey;
