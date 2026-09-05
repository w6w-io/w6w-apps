import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatOpusError } from "../lib/client.ts";

/**
 * OpusClip API key — `Authorization: Bearer <key>`.
 *
 * Verified against `components.securitySchemes.bearer` in OpusClip's OpenAPI
 * document (fetched 2026-09-05) plus live probes against `api.opus.pro` the
 * same day. The dashboard names it an "API key" (`sk-...`, per the webhook
 * docs) but the wire format is an ordinary bearer token.
 *
 * ## The probe, and why
 *
 * `GET /api/social-accounts?q=mine` was picked over every alternative in the
 * documented surface:
 *
 * - It needs **no other resource to exist** — no project, no clip, no
 *   collection id — unlike `GET /api/clip-projects/{projectId}` or
 *   `GET /api/exportable-clips`, both of which need a real id to answer
 *   anything but a 404 that says nothing about the credential.
 * - It returns **no credential material** — a list of `postAccountId` /
 *   `platform` / `extUserName` rows for the caller's own connected social
 *   destinations, nothing secret.
 * - It is the vendor's own recommended first step (`help.opus.pro/api-reference/
 *   endpoints/social-posting/overview`, "Step 1: Get Social Accounts").
 * - An empty list (no social accounts connected) is still `200 {"data": []}` —
 *   it answers whether the *credential* is live, not whether the workspace
 *   happens to use social posting.
 *
 * ## Classifying by body, not status
 *
 * Live-probed on 2026-09-05: with no `Authorization` header, and again with a
 * syntactically plausible but fake bearer token, `api.opus.pro` answered `401`
 * both times with `content-type: text/plain` and a body that is literally the
 * 12-byte string `Unauthorized` — not JSON. That is the one shape this probe
 * needs to recognise; any other 4xx/5xx is reported via
 * {@link formatOpusError}, which already knows the vendor's other error shapes
 * (`{errorName, errorMessage}`, the monthly-cap `{code}` object) from the
 * Action client, so a 403 monthly-cap hit here is reported as exactly that
 * rather than a generic "credential rejected".
 */

export interface OpusClipCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<OpusClipCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

export const PROBE_PATH = "/api/social-accounts";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "An OpusClip API key from the dashboard (lower-left corner, or your API settings — starts " +
    "with sk-...). API access requires the Pro (Beta), Max, or Business plan.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "clip.opus.pro/dashboard, lower-left corner. Looks like sk-....",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The key never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<OpusClipCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<OpusClipCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const url = new URL(`${API_BASE}${PROBE_PATH}`);
    url.searchParams.set("q", "mine");
    const res = await ctx.fetch(url.toString(), {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "OpusClip rejected the API key (401 Unauthorized). Check it was copied " +
          "exactly from the dashboard and has not been rotated.",
      };
    }

    const detail = await res.text().catch(() => "");
    return { ok: false, message: formatOpusError(res.status, "GET", url.pathname, detail) };
  },
};

export default apiKey;
