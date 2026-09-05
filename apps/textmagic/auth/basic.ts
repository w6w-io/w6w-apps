import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatTextMagicError } from "../lib/client.ts";

/**
 * Username + API Key (`basic`) — HTTP Basic auth, the one scheme TextMagic's
 * OpenAPI document declares (`securityDefinitions.BasicAuth`, applied to all
 * 139 paths by the document's top-level `security`).
 *
 * The username is the account's TextMagic **username** (not its email), and
 * the password is an **API key** minted at
 * my.textmagic.com/online/api/rest-api/keys — never the account login
 * password. Verified 2026-09-05 against `docs.textmagic.com`'s own "Getting
 * started" section, which also documents an `X-TM-Username` / `X-TM-Key`
 * header pair as an alternative; that pair is not a declared
 * `securityDefinitions` scheme anywhere in the spec, so this app uses Basic.
 *
 * ## The probe: `GET /ping`, not `GET /user`
 *
 * `GET /user` ("Get current account information") is the obvious whoami and is
 * exactly what `actions/account-get.ts` calls — but nothing in its response is
 * secret (see that file), so either endpoint would be safe to reuse here on
 * that count. `GET /ping` is used instead because it needs no more than the
 * bare credential (no account-level read scope of any kind can be missing) and
 * its `{userId, ping, utcDateTime}` body is the smallest possible proof of a
 * live session — it is what TextMagic's own SDK quick-start samples use to
 * "test connection".
 */

export interface TextMagicCredential {
  username: string;
  apiKey: string;
}

/** The one place the Basic auth header is built, shared by `sign` and `test`. */
export function authHeader(credential: Partial<TextMagicCredential>): string {
  const username = credential.username ?? "";
  const apiKey = credential.apiKey ?? "";
  return `Basic ${btoa(`${username}:${apiKey}`)}`;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & API Key",
  description:
    "TextMagic username plus an API key from my.textmagic.com/online/api/rest-api/keys — " +
    "never the account login password.",
  connectionLabel: "{{username}}",
  fields: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      row: "creds",
      hint: "Your TextMagic username (not your email address).",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Generated at my.textmagic.com/online/api/rest-api/keys.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = authHeader(credential as Partial<TextMagicCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const { username, apiKey } = credential as Partial<TextMagicCredential>;
    if (!username || !apiKey) {
      return { ok: false, message: "credential missing username or apiKey" };
    }
    const res = await ctx.fetch(`${API_BASE}/ping`, {
      headers: { accept: "application/json", authorization: authHeader({ username, apiKey }) },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        message: formatTextMagicError(res.status, "GET", "/api/v2/ping", detail),
      };
    }
    return { ok: true };
  },
};

export default basic;
