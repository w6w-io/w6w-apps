import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Givebutter API key — `Authorization: Bearer <api key>`.
 *
 * Verified against `components.securitySchemes` in Givebutter's OpenAPI
 * document (`{"http": {"type": "http", "scheme": "bearer"}}`, the ONLY scheme
 * declared) and live probes against `api.givebutter.com` on 2026-09-05.
 * Givebutter publishes no OAuth surface for third-party integrations; an API
 * key generated in the dashboard (Settings > Integrations > API Keys) is the
 * entire authentication story.
 *
 * ## The probe, and why it is not a dedicated whoami
 *
 * Givebutter documents no `/v1/me`, `/v1/account` or ping endpoint reachable
 * with an API key. The two candidates that read as "whoami" —
 * `GET /sso/v1/account` and `GET /sso/v1/campaigns/{campaign}` — belong to a
 * different, session-based SSO flow: probed live with a bearer token, both
 * answer an HTTP 302 redirect to `/login` rather than 200 or 401. So this app
 * probes `GET /v1/campaigns?per_page=1` instead — the cheapest real resource
 * read, bounded to one record, that requires a live credential and returns
 * nothing sensitive beyond campaign metadata the connecting org already owns.
 */

export interface GivebutterCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<GivebutterCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module doc for why this and not a dedicated whoami. */
export const PROBE_PATH = "/campaigns";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Givebutter Dashboard > Settings > Integrations > API Keys. The key " +
    "is shown only once at creation — store it securely.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Givebutter Dashboard > Settings > Integrations > API Keys > Create New API Key.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<GivebutterCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Classify by the response body, not the bare status code.
   *
   * Givebutter's error taxonomy is thin — a 401 and a 403 each carry a single
   * fixed message rather than a machine-readable `type` code (contrast
   * Apify's `token-not-provided` vs `user-or-token-not-found`) — but the body
   * is still read rather than trusting the status alone, because the same
   * status code covers unrelated failure modes elsewhere in this API (a 404
   * that never reached the JSON-answering router at all — see `lib/client.ts`
   * — is one; the marketing site's HTML 404 has no parseable body at all).
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GivebutterCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?per_page=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: key }) } },
    );
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const body = (() => {
      try {
        return JSON.parse(raw) as { error?: { message?: string }; message?: string };
      } catch {
        return null;
      }
    })();
    const message = body?.error?.message ?? body?.message;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Givebutter rejected the API key (401${message ? ` ${message}` : ""}). Check ` +
          "it was copied exactly from Dashboard > Settings > Integrations > API Keys and has " +
          "not been revoked.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Givebutter refused the campaigns read (403${message ? ` ${message}` : ""}).`,
      };
    }
    if (!message) {
      return {
        ok: false,
        message: `Givebutter returned HTTP ${res.status} with an unreadable body for ` +
          `${PROBE_PATH} — likely the marketing site's own error page rather than the API.`,
      };
    }
    return { ok: false, message: `Givebutter returned HTTP ${res.status}: ${message}` };
  },
};

export default apiKey;
