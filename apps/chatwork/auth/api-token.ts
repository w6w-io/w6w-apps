import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatChatworkError } from "../lib/client.ts";

/**
 * Chatwork personal API token — sent as `X-ChatWorkToken: <token>`.
 *
 * Verified against Chatwork's OpenAPI 3.1 document
 * (`components.securitySchemes.chatwork_token`, fetched 2026-08-29 from
 * `developer.chatwork.com`) and a live probe against `api.chatwork.com` the
 * same day.
 *
 * ## Header, not Bearer
 *
 * The spec's security scheme is a bare `apiKey` in the header named
 * `x-chatworktoken` — not an `Authorization: Bearer` scheme. Chatwork's own
 * UI and every reference page display it as `X-ChatWorkToken`; header names
 * are case-insensitive over HTTP, so this app sends that exact casing rather
 * than the lowercase form the OpenAPI identifier uses.
 *
 * ## OAuth2 is documented; this app does not implement it
 *
 * Chatwork also documents a full `authorizationCode` OAuth2 flow with 20
 * granular scopes. That is the right choice for a public third-party app
 * catalog product; a personal API token is what "Getting started with the
 * Chatwork API" (`developer.chatwork.com/docs/getting-started`) tells a
 * developer to generate for their own integration, and it is the only auth
 * this app declares — adding OAuth2 would need a registered Chatwork OAuth
 * client, which is a publisher-side asset this app does not have.
 *
 * ## Getting a token requires admin approval
 *
 * Per the vendor's own getting-started guide: issuing an API token requires
 * the organization administrator's approval (waived only on the Personal
 * plan). A `test` failure right after connecting is as likely to mean "not
 * approved yet" as "wrong token" — see the message below.
 *
 * ## The probe: `GET /me`
 *
 * `GET /me` returns the connected account's profile (name, organization,
 * department, contact fields). Unlike some vendors' "whoami" endpoints, it
 * does **not** echo the API token or any other credential back — confirmed
 * against its full response schema, which lists only profile fields. No
 * scope restriction applies to it beyond holding a valid token, so it is
 * reachable regardless of which OAuth scopes a token would otherwise carry
 * (this app uses the personal-token flow, which carries no scopes at all).
 *
 * Live probes on 2026-08-29 confirm the vendor gives the **same** message for
 * "no token reached the API" and "the token is wrong" — both answer
 * `401 {"errors":["Invalid API Token"]}` — so `test` cannot distinguish those
 * cases from the response body and does not pretend to.
 */

export interface ChatworkCredential {
  apiToken: string;
}

/** The exact header Chatwork's docs display, kept in one place. */
export const TOKEN_HEADER = "X-ChatWorkToken";

export function authHeaders(credential: Partial<ChatworkCredential>): Record<string, string> {
  return { [TOKEN_HEADER]: credential.apiToken ?? "" };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste a personal API token from Chatwork > your name (top right) > Service Integrations " +
    "> API Token. Issuing a token requires your organization administrator's approval, unless " +
    "you are on the Personal plan.",
  connectionLabel: "Chatwork ({{name}})",
  apiKey: { in: "header", name: TOKEN_HEADER },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: 'Chatwork > your name > "Service Integrations" > "API Token".',
    },
  ],

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<ChatworkCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ChatworkCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}/me`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Chatwork rejected the token (401 Invalid API Token). This is the same message for a " +
          "missing token and a wrong one — re-copy it from Chatwork > Service Integrations > API " +
          "Token, and confirm an administrator has approved API access for this account.",
      };
    }
    return { ok: false, message: formatChatworkError(res.status, "GET", "/me", raw) };
  },

  /**
   * Publish the account's display name, so a list of Connections doesn't just
   * read "Chatwork" for every one. Failure here is silent: `test` already
   * established the token is live, and a missing label must not fail a good
   * Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ChatworkCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/me`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; chatwork_id?: string };
      if (!body?.name) return {};
      return body.chatwork_id ? { name: body.name, chatworkId: body.chatwork_id } : {
        name: body.name,
      };
    } catch {
      return {};
    }
  },
};

export default apiToken;
