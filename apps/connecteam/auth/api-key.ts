import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatConnecteamError } from "../lib/client.ts";

/**
 * Connecteam API key — `X-API-KEY: <key>`.
 *
 * Verified against `components.securitySchemes.APIKeyHeader` in Connecteam's
 * OpenAPI 3.1 document and live probes against `api.connecteam.com`, both on
 * 2026-08-29.
 *
 * ## Not a bearer token
 *
 * Connecteam issues one API key per company (Settings > Integrations > API
 * Keys in the Connecteam dashboard) and expects it verbatim in a custom
 * header — **no `Bearer ` prefix, and not the `Authorization` header at
 * all**. Every endpoint's `security` array lists `APIKeyHeader` (this) ahead
 * of `OAuth2` (a client-credentials flow this app does not implement — see
 * below), so the key alone is a complete, first-class way to authenticate.
 *
 * ## OAuth2 exists and is deliberately not implemented here
 *
 * The same document also declares an `OAuth2` `clientCredentials` scheme
 * (`POST /oauth/v1/token`, `HTTPBasic` with `client_id`/`client_secret`) that
 * mints a scoped, expiring bearer token. It is a real, documented alternative
 * — not a decoy — but it requires token-exchange and refresh machinery this
 * app does not build: the static API key already reaches every endpoint this
 * app calls, with no expiry to manage. A future app version can add it as a
 * second Auth method without touching this one.
 *
 * ## `test` reads the body, not just the status code
 *
 * Two failure shapes were observed live and are genuinely different problems:
 *
 *  - No `X-API-KEY` header reaches Connecteam at all → `401` with
 *    `{"error": "No authentication provided", ...}`. This should not happen
 *    once `sign` has run, and seeing it means the credential never reached
 *    the request.
 *  - A syntactically plausible but wrong/revoked key → `403` with
 *    `{"detail": "Invalid API key"}`.
 *
 * See `lib/client.ts` for why both shapes are read explicitly rather than
 * inferred from the status code alone.
 */

export interface ConnecteamCredential {
  apiKey: string;
}

/** `GET /me` — see {@link WHY_ME_IS_SAFE} for why this is a safe probe. */
export const PROBE_PATH = "/me";

/**
 * Why `/me` is safe to use both as the credential-liveness probe AND as the
 * source of the connection label, unlike whoami traps such as Follow Up
 * Boss's `/me` or Mailjet's `/apikey`.
 *
 * `GET /me` returns `MeResponse`: exactly `{companyName, companyId}` per the
 * OpenAPI schema, confirmed live on 2026-08-29. Neither field is a secret —
 * `companyId` is an opaque identifier, not a credential — so nothing here
 * needs to be stripped before it is stored or displayed, unlike Apify's
 * `/v2/users/me` (which returns a live proxy password) or Bland AI's `/v1/me`
 * pattern this pack already treats as unsafe elsewhere.
 *
 * It is also the narrowest-scope-safe choice: Connecteam's API key carries no
 * per-scope restriction the way an OAuth2 token would (the key is company-wide
 * by design), so there is no "correctly scoped key gets refused" failure mode
 * to avoid here — every valid key reaches `/me`.
 */
export const WHY_ME_IS_SAFE =
  "GET /me returns only {companyName, companyId} — no credential or scope-restricted field";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the company API key from Connecteam > Settings > Integrations > API Keys. One key " +
    "authenticates every endpoint this app uses.",
  connectionLabel: "Connecteam ({{companyName}})",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Connecteam dashboard > Settings > Integrations > API Keys.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. Note the header name, not `Authorization`.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ConnecteamCredential>;
    request.headers["x-api-key"] = cred.apiKey ?? "";
    return request;
  },

  /** See {@link PROBE_PATH} and {@link WHY_ME_IS_SAFE}. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ConnecteamCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let body: { error?: string; detail?: string } | null = null;
    try {
      body = JSON.parse(raw);
    } catch { /* fall through to the generic message below */ }

    if (res.status === 401 && body?.error === "No authentication provided") {
      return {
        ok: false,
        message: "Connecteam received no API key. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `Connecteam rejected the API key (403${
            body?.detail ? `: ${body.detail}` : ""
          }). Check it was copied exactly from Settings > Integrations > API Keys and has not ` +
          "been revoked.",
      };
    }
    return { ok: false, message: formatConnecteamError(res.status, "GET", PROBE_PATH, raw) };
  },

  /**
   * Publish the company name for {@link connectionLabel}. `/me` carries
   * nothing else worth surfacing (see {@link WHY_ME_IS_SAFE}), so this takes
   * exactly the two documented fields and nothing more.
   *
   * A failure here is deliberately silent: `test` has already established the
   * key is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ConnecteamCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", "x-api-key": cred.apiKey ?? "" },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: { companyName?: string; companyId?: string } };
      const companyName = body?.data?.companyName;
      const companyId = body?.data?.companyId;
      if (!companyName) return {};
      return companyId ? { companyName, companyId } : { companyName };
    } catch {
      return {};
    }
  },
};

export default apiKey;
