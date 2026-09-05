import type { AuthDefinition } from "@w6w/types";
import { DEFAULT_API_BASE, describeError, normalizeApiBase } from "../lib/client.ts";

/**
 * Company + admin login + password (or API User Key), exchanged for a bearer
 * pair of headers.
 *
 * ## Why `custom`, not `basic`
 *
 * SimplyBook.me does not accept the typed credential on every request the way
 * HTTP Basic would. `POST /admin/auth` takes `{company, login, password}` and
 * returns a `TokenEntity` (`token` + `refresh_token`); every subsequent call
 * carries `X-Company-Login: <company>` + `X-Token: <token>` instead. The
 * credential the user types is therefore not the credential that signs
 * requests, so this is `custom` with an `exchange` hook.
 *
 * ## Two ways to fill `password`, one of them safer
 *
 * The endpoint's own description documents both: a real admin **password**
 * (subject to 2FA and IP-allowlist verification, if the account has either
 * enabled), or an **API User Key** (`api_user_key_...`, minted at Settings →
 * API User Keys) which bypasses IP verification and is meant for exactly this
 * kind of integration. Neither is validated client-side — SimplyBook.me
 * accepts whichever shape `password` has.
 *
 * ## Two-factor authentication cannot be completed here
 *
 * `TokenEntity.require2fa` comes back `true` (with `token`/`refresh_token`
 * both empty) when the account has 2FA enabled and a password login is used.
 * Completing it needs a second, interactive round trip (`POST /admin/auth/2fa`
 * with a code the user has not been asked for) that has nowhere to live in a
 * one-shot connect flow, so `exchange` fails loudly with a clear next step
 * instead of silently storing an unusable empty token.
 *
 * ## The API host is not decidable from the credential
 *
 * See `../lib/client.ts` for why `apiBase` is a field here, validated against
 * the API's own published server list, and echoed into the connection's
 * display metadata by `afterConnect` so every action can read it back.
 */
export interface SimplybookCredential {
  apiBase: string;
  company: string;
  token: string;
  refreshToken?: string;
}

interface TokenEntity {
  token?: string;
  company?: string;
  refresh_token?: string | null;
  require2fa?: boolean;
}

const login: AuthDefinition = {
  key: "login",
  type: "custom",
  displayName: "Company Login & Password",
  description:
    "Your SimplyBook.me company identifier, admin login and password (or API User Key from " +
    "Settings → API User Keys).",
  connectionLabel: "SimplyBook.me ({{company}})",
  fields: [
    {
      key: "company",
      label: "Company",
      type: "string",
      required: true,
      hint: "The company identifier in your booking page URL, e.g. the `acme` in " +
        "acme.simplybook.me.",
    },
    { key: "login", label: "Admin login", type: "string", required: true, row: "creds" },
    {
      key: "password",
      label: "Password or API User Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "A real admin password, or an API User Key (Settings → API User Keys) — the latter " +
        "skips IP-allowlist verification and does not require 2FA.",
    },
    {
      key: "apiBase",
      label: "API base URL",
      type: "string",
      default: DEFAULT_API_BASE,
      advanced: true,
      hint: "Leave as the default unless SimplyBook.me support assigned your account a specific " +
        "regional or Enterprise server.",
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const company = String(f.company ?? "").trim();
    const userLogin = String(f.login ?? "").trim();
    const password = String(f.password ?? "");
    if (!company) throw new Error("`company` is required");
    if (!userLogin) throw new Error("`login` is required");
    if (!password) throw new Error("`password` is required");
    const apiBase = normalizeApiBase(f.apiBase as string | undefined);

    const res = await ctx.fetch(`${apiBase}/admin/auth`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ company, login: userLogin, password }),
    });
    if (!res.ok) {
      const { message } = await describeError(res, "POST", "/admin/auth");
      throw new Error(message);
    }
    const body = await res.json() as TokenEntity;
    if (body.require2fa) {
      throw new Error(
        "This SimplyBook.me user has two-factor authentication enabled, so the login " +
          "succeeded but returned no usable token. Either connect with an API User Key " +
          "(Settings → API User Keys — bypasses 2FA and IP verification) or disable 2FA " +
          "for this admin user.",
      );
    }
    if (!body.token) throw new Error("SimplyBook.me login succeeded but returned no token");
    return {
      apiBase,
      company: body.company || company,
      token: body.token,
      refreshToken: body.refresh_token || undefined,
    } satisfies SimplybookCredential;
  },

  sign({ request, credential }) {
    const { company, token } = credential as Partial<SimplybookCredential>;
    if (company) request.headers["x-company-login"] = company;
    if (token) request.headers["x-token"] = token;
    return request;
  },

  /**
   * `POST /admin/auth/refresh-token` — a real, documented refresh flow (unlike
   * some apps in this pack that have to re-run the login exchange), so the
   * password is never retained past `exchange`.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as SimplybookCredential;
    if (!cred.refreshToken) {
      throw new Error("credential has no refresh token — reconnect the account");
    }
    const res = await ctx.fetch(`${cred.apiBase}/admin/auth/refresh-token`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ company: cred.company, refresh_token: cred.refreshToken }),
    });
    if (!res.ok) {
      const { message } = await describeError(res, "POST", "/admin/auth/refresh-token");
      throw new Error(message);
    }
    const body = await res.json() as TokenEntity;
    if (!body.token) throw new Error("SimplyBook.me refresh succeeded but returned no token");
    return {
      apiBase: cred.apiBase,
      company: body.company || cred.company,
      token: body.token,
      refreshToken: body.refresh_token || cred.refreshToken,
    } satisfies SimplybookCredential;
  },

  /**
   * `GET /admin/services` — every SimplyBook.me admin credential can read
   * services (they are the basis of every booking), unlike `/admin/clients`
   * or `/admin/tariff/current`, which document their own narrower
   * `AccessDenied` cases. Cheap and side-effect-free.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SimplybookCredential>;
    if (!cred.apiBase || !cred.company || !cred.token) {
      return { ok: false, message: "credential missing apiBase, company or token — reconnect" };
    }
    const res = await ctx.fetch(`${cred.apiBase}/admin/services`, {
      headers: {
        accept: "application/json",
        "x-company-login": cred.company,
        "x-token": cred.token,
      },
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }
    if (res.status === 401 || res.status === 403 || res.status === 419) {
      await res.body?.cancel();
      return {
        ok: false,
        message: `SimplyBook.me rejected the token (${res.status}) — it may have expired or ` +
          "been revoked. Reconnect the account.",
      };
    }
    const { message } = await describeError(res, "GET", "/admin/services");
    return { ok: false, message };
  },

  /** Records the API host and company every action needs — see `../lib/client.ts`. */
  afterConnect({ credential }) {
    const cred = credential as SimplybookCredential;
    return { apiBase: cred.apiBase, company: cred.company };
  },

  /**
   * `POST /admin/auth/logout` — best-effort. Disconnecting locally must
   * succeed even if SimplyBook.me is unreachable or the token already
   * expired.
   */
  async revoke({ credential }, ctx) {
    const cred = credential as Partial<SimplybookCredential>;
    if (!cred.apiBase || !cred.company || !cred.token) return;
    try {
      await ctx.fetch(`${cred.apiBase}/admin/auth/logout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "x-company-login": cred.company,
          "x-token": cred.token,
        },
        body: JSON.stringify({ auth_token: cred.token }),
      });
    } catch {
      // best-effort — local disconnect proceeds regardless.
    }
  },
};

export default login;
