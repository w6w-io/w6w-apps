import type { AuthDefinition } from "@w6w/types";
import { METHOD_PATH, normalizeBaseUrl, unwrapError } from "../lib/client.ts";

/**
 * A site URL plus an API Key/Secret pair, sent as `Authorization: token
 * api_key:api_secret`.
 *
 * ## The scheme word is `token`, and the pair is colon-joined
 *
 * Frappe's own REST documentation states it exactly: "The token is generated
 * by concatenating `api_key` and `api_secret` with a colon `:`. Pass the
 * string `token api_key:api_secret` to the `Authorization` header." Verified
 * against `docs.frappe.io/framework/user/en/api/rest` (fetched 2026-09-05) and
 * the framework's own `validate_auth_via_api_keys`
 * (`frappe/auth.py`, `develop` branch, same day): the header is split on the
 * FIRST colon only (`auth_token.split(":")`... actually `.split(":")` with no
 * limit — a secret containing `:` would break this, but Frappe's own API
 * Secret generator never produces one), so a literal `token ` prefix (with
 * the trailing space) followed by `api_key:api_secret` is what the server
 * expects.
 *
 * ## Why not OAuth2 or session cookies
 *
 * Frappe documents three auth modes: this token pair, password-based session
 * cookies, and OAuth2 access tokens. Session cookies need cookie-jar state
 * this sandbox has no reason to carry for a bot integration, and OAuth2
 * requires a site to have a configured OAuth Client — an extra setup step a
 * self-hosted install may not have taken. The API Key/Secret pair needs
 * neither: it is generated once from a User's own settings page and works
 * immediately, which is why Frappe's docs lead with it.
 *
 * ## The site URL is half the credential
 *
 * ERPNext is self-hosted: a key pair is meaningless without the address of
 * the site that issued it. Both are asked for together and the URL is
 * normalised once at connect time.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key & Secret",
  description: "A site URL plus an API Key and API Secret from a User's Settings tab. Sent as " +
    "`Authorization: token <api_key>:<api_secret>`.",
  connectionLabel: "{{user}} @ {{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Site URL",
      type: "string",
      required: true,
      placeholder: "https://mycompany.erpnext.com",
      hint: "Your ERPNext / Frappe site. A URL without a scheme is assumed to be https.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Open the desired User, go to its Settings tab, expand API Access, and click " +
        "Generate Keys. Every call made with this key is logged and permission-checked against " +
        "that User — a dedicated bot User with only the roles the workflow needs is recommended.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
      hint: "Shown once, in the same Generate Keys popup as the API Key. Regenerating it " +
        "invalidates the previous secret immediately.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, apiSecret } = credential as { apiKey: string; apiSecret: string };
    request.headers["authorization"] = `token ${apiKey}:${apiSecret}`;
    return request;
  },

  /**
   * `GET /api/method/frappe.auth.get_logged_user` is the narrowest call that
   * proves the key pair works: it needs no DocType permission at all, only a
   * valid session/token, and its response — the user's own id — is exactly
   * what makes a useful connection label. Verified in the docs' own example
   * (`{"message": "[email]"}`) and, for the failure path, against
   * `frappe/exceptions.py`: a bad key or secret raises `AuthenticationError`,
   * which the framework maps to **HTTP 401** — never 200-with-error-body the
   * way Odoo's `/jsonrpc` does, so the status code alone is trustworthy here.
   */
  async test({ credential }, ctx) {
    const { apiKey, apiSecret, baseUrl } = credential as {
      apiKey?: string;
      apiSecret?: string;
      baseUrl?: string;
    };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!apiSecret) return { ok: false, message: "credential missing apiSecret" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${METHOD_PATH}/frappe.auth.get_logged_user`, {
        headers: { authorization: `token ${apiKey}:${apiSecret}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return { ok: false, message: "ERPNext rejected the API Key/Secret pair (401)" };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "the credential is valid but this User may not call this method (403)",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Frappe API at ${base}${METHOD_PATH} (404) — check the site URL`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `ERPNext returned ${res.status}: ${unwrapError(res.status, text)}`,
      };
    }
    return { ok: true };
  },

  /** Records the site and the account the key belongs to. Never the secret. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as {
      credential: { apiKey?: string; apiSecret?: string; baseUrl?: string };
    };
    const display: Record<string, unknown> = {
      baseUrl: credential.baseUrl ? normalizeBaseUrl(credential.baseUrl) : undefined,
    };
    if (!credential.apiKey || !credential.apiSecret || !display.baseUrl) return display;

    try {
      const res = await ctx.fetch(
        `${display.baseUrl}${METHOD_PATH}/frappe.auth.get_logged_user`,
        {
          headers: {
            authorization: `token ${credential.apiKey}:${credential.apiSecret}`,
            accept: "application/json",
          },
        },
      );
      if (!res.ok) return display;
      const body = await res.json() as { message?: string };
      display.user = body.message;
      return display;
    } catch {
      return display;
    }
  },
};

export default apiKey;
