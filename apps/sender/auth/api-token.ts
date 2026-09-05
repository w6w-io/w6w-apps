import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Sender API token — `Authorization: Bearer <token>`.
 *
 * Verified against `api.sender.net/authentication/`, fetched 2026-09-05:
 * "The Sender API uses tokens to authenticate requests... Authentication is
 * performed using bearer auth... `-H "Authorization: Bearer {Your token}"`."
 * That page also warns the token "carries full access to your account" —
 * Sender documents no scoped-token concept, unlike Apify or GitHub.
 *
 * ## Probe choice: `GET /v2/groups?limit=1`
 *
 * Chosen by reading the response shape, not by guessing:
 *
 *  - **It requires a credential.** Every documented endpoint under
 *    `/v2/*` requires the bearer token; there is no public/unauthenticated
 *    Sender endpoint documented anywhere in the crawled sitemap.
 *  - **It returns no credential material.** A groups list is
 *    `{id, title, recipient_count, ...}` — no token, no account secret.
 *  - **It is the cheapest available read.** Every account has a groups
 *    endpoint regardless of plan; `limit=1` keeps the response small.
 *
 * ## What "invalid" looks like is not fully documented
 *
 * `api.sender.net/errors/` states "401 - Means that we could not authenticate
 * you. Check your API key" but gives no worked JSON example for 401 (unlike
 * 400 and 422, which the vendor does show). This hook therefore classifies
 * failure from whatever `message` the response body actually carries plus the
 * HTTP status — it does not assume one exact, unverified string.
 */

export interface SenderCredential {
  apiToken: string;
}

/** The one place the wire format is built, reused by `sign` and `test`. */
export function authHeaders(credential: Partial<SenderCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/** The credential-liveness probe path. See the module doc for why this endpoint. */
export const PROBE_PATH = "/groups";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste an API token from your Sender account settings. Sender tokens are not scoped — a " +
    "token carries full access to the account it belongs to.",
  connectionLabel: "Sender",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Sender account settings > API. Keep this secret — it grants full account access.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<SenderCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SenderCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiToken: token }) } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const message = body?.message;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Sender rejected the token (401${message ? `: ${message}` : ""}). Check it was ` +
          "copied exactly from Sender account settings and has not been revoked.",
      };
    }
    return {
      ok: false,
      message: `Sender returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiToken;
