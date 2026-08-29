import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Readwise access token — `Authorization: Token <token>`.
 *
 * Verified against `readwise.io/api_deets` (read 2026-08-29): "Set a header
 * with key 'Authorization' and value: 'Token XXX' where XXX is your Readwise
 * access token." **This is not the `Bearer` scheme** — a live probe on
 * 2026-08-29 confirmed `Authorization: Bearer <token>` is treated identically
 * to no credential at all (`401 {"detail": "Authentication credentials were
 * not provided."}`), so the literal `Token ` prefix is load-bearing.
 *
 * ## The dedicated auth-check endpoint
 *
 * The docs name a purpose-built liveness probe: "If you want to check that a
 * token is valid, just make a GET request to
 * `https://readwise.io/api/v2/auth/` with the above header. You should
 * receive a 204 response." Measured live on 2026-08-29:
 *
 *  - No credential: `401 {"detail": "Authentication credentials were not
 *    provided."}`
 *  - Wrong/revoked token: `401 {"detail": "Invalid token."}`
 *  - Live token: `204` with an empty body.
 *
 * A `204` carries no payload of any kind, so this probe cannot echo the
 * caller's own token back — unlike a `/whoami`-shaped endpoint, there is
 * nothing in the response to leak. This is exactly the "vendor documents a
 * dedicated auth endpoint for exactly this" case, so no alternative probe was
 * considered.
 */

export interface ReadwiseCredential {
  accessToken: string;
}

export const AUTH_CHECK_URL = `${API_BASE}${API_PREFIX}/auth/`;

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<ReadwiseCredential>): Record<string, string> {
  return { authorization: `Token ${credential.accessToken ?? ""}` };
}

const apiToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description:
    "Paste your Readwise access token from readwise.io/access_token. Every request against " +
    "this app is made on your behalf using this single token.",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Get yours at readwise.io/access_token.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. The token never appears in a URL —
   * Readwise's own security note against a `?token=` query form applies here
   * the same way it does to every header-based scheme.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ReadwiseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link AUTH_CHECK_URL} — the vendor's own dedicated liveness probe. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ReadwiseCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(AUTH_CHECK_URL, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    if (res.status === 204) return { ok: true };

    const body = await res.json().catch(() => null) as { detail?: string } | null;
    if (res.status === 401) {
      return {
        ok: false,
        message: body?.detail === "Invalid token."
          ? "Readwise rejected the token. Check it was copied exactly from readwise.io/access_token."
          : `Readwise returned 401${body?.detail ? `: ${body.detail}` : ""}.`,
      };
    }
    return {
      ok: false,
      message: `Readwise returned HTTP ${res.status} for the auth check` +
        `${body?.detail ? `: ${body.detail}` : ""}`,
    };
  },
};

export default apiToken;
