import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Airtop API key — `Authorization: Bearer <api-key>`.
 *
 * Confirmed against `components.securitySchemes.BearerAuth` in Airtop's
 * OpenAPI document (`scheme: "http"`, `type: "bearer"`,
 * `x-fern-bearer.name: "apiKey"`) and against the live API on 2026-09-01: an
 * unauthenticated `GET /v1/sessions` answers
 * `401 {"message":"missing required header authorization"}`, and a
 * syntactically-plausible but wrong key answers
 * `401 {"message":"invalid api key"}`. Both were observed on the wire.
 */

export interface AirtopCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<AirtopCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v1/sessions?limit=1`.
 *
 * Chosen over the tempting alternative of just checking for a non-error status
 * because Airtop's error body distinguishes *why* a call failed
 * (`"missing required header authorization"` vs `"invalid api key"`), and
 * because a session list is the narrowest read that (a) requires a credential
 * — confirmed to 401 with none — and (b) returns nothing secret: a session's
 * `cdpUrl` / `cdpWsUrl` / `chromedriverUrl` fields are connection endpoints
 * that themselves require `Authorization: Bearer <api-key>` to use, not the
 * key itself. `limit=1` keeps the probe cheap regardless of how many sessions
 * the account has open.
 */
export const PROBE_PATH = "/v1/sessions";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from the Airtop portal (Settings > API Keys).",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From the Airtop portal, Settings > API Keys.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<AirtopCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. Classifies by the response BODY, never by status alone. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AirtopCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    if (!apiKeyValue) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: apiKeyValue }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const message = body?.message;

    if (message === "missing required header authorization") {
      return {
        ok: false,
        message: "Airtop received no credential. The API key did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (message === "invalid api key" || res.status === 401) {
      return {
        ok: false,
        message: `Airtop rejected the API key (${res.status}${
          message ? `: ${message}` : ""
        }). Check it was copied exactly and has not been revoked in the Airtop portal.`,
      };
    }
    return {
      ok: false,
      message: `Airtop returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiKey;
