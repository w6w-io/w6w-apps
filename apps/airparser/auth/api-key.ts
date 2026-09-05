import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Airparser API key — `X-API-Key: <key>` header.
 *
 * Verified against `help.airparser.com/public-api/public-api` (fetched
 * 2026-09-05): "Include the API key in the X-API-Key HTTP header. If the
 * request is not authenticated, the API returns HTTP 401 Unauthorized." There
 * is exactly one auth scheme documented — no OAuth surface, no basic auth.
 *
 * ## The probe: `GET /inboxes`
 *
 * Chosen for what it does and does not return, not for its name:
 *
 * - **It requires a credential.** Unauthenticated and wrong-key requests both
 *   answer `401 Unauthorized` (see the finding in `lib/client.ts` — Airparser
 *   does not distinguish the two cases on the wire, so this hook does not
 *   pretend to either).
 * - **It returns no credential material.** The response is the caller's own
 *   list of inboxes — names and parsing configuration, not an API key or
 *   anything that could stand in for one. Airparser's Public API doc
 *   publishes no `/whoami` or `/account` endpoint at all, so there is no
 *   Mailjet-`/apikey` / Follow Up Boss-`/me` trap to avoid here — the
 *   documented surface simply never echoes the key back.
 * - **It is cheap and read-only.** No document is uploaded, no inbox is
 *   created or deleted, and it needs no path parameter the caller might not
 *   have yet (unlike every document/inbox action here, which requires an
 *   inbox or document id).
 */

export interface AirparserCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<AirparserCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from your Airparser account settings.",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Airparser account settings. Sent as the X-API-Key header on every request.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<AirparserCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AirparserCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/inboxes`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Airparser rejected the API key (401 Unauthorized). Airparser's API answers the same " +
          "way for a missing key and a wrong one, so this could be either — check the key was " +
          "copied exactly from your Airparser account settings and has not been rotated.",
      };
    }
    const body = await res.json().catch(() => null) as { message?: string } | null;
    return {
      ok: false,
      message: `Airparser returned HTTP ${res.status} for GET /inboxes${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },
};

export default apiKey;
