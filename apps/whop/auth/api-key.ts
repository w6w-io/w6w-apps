import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_VERSION_DATE } from "../lib/client.ts";

/**
 * Whop API key — `Authorization: Bearer <key>`.
 *
 * Verified 2026-08-29 against `docs.whop.com/developer/api/getting-started`
 * and the Permissions API reference, plus live probes against
 * `api.whop.com`.
 *
 * ## Two key shapes, one header
 *
 * Whop issues two kinds of API key, and this Auth method accepts either
 * without asking which: an **Account API key** ("access ... your own Account
 * and connected accounts"), or an **App API key** ("access data on accounts
 * that have installed your app"). Both are sent the same way — `Authorization:
 * Bearer <key>` — and Whop's own OAuth security scheme description says as
 * much: "An Account API key, account-scoped JWT, App API key, or user OAuth
 * token."
 *
 * ## Why `accountId` is a connect-time field, not just an action param
 *
 * An Account API key is implicitly scoped to one account, but an App API key
 * is not: it can reach every account that installed the app, and several list
 * endpoints (`GET /webhooks`, `GET /promo_codes`) *require* an explicit
 * `account_id` with no default to fall back to. Collecting `accountId` once,
 * here, means:
 *
 *  1. the credential test below has a `resource_id` to check without guessing
 *     one, and
 *  2. actions that need it can default to the connection's own account
 *     instead of forcing every call to repeat it.
 *
 * ## The probe is `GET /permissions`, not `GET /users/me`
 *
 * Two endpoints were measured live before picking one:
 *
 *  - **`GET /users/me`** answers `404 {"error":{"type":"not_found","message":
 *    "User not found"}}` for BOTH a missing Authorization header and a
 *    syntactically valid but fake bearer token (measured 2026-08-29, with and
 *    without `Api-Version-Date`) — it cannot tell "no credential" from "bad
 *    credential" apart from a genuine 404. Worse, "the authenticated *user*"
 *    is a session/OAuth-token concept; an App API key authenticates as the
 *    app, not as a person, so `/users/me` may 404 for a perfectly live App
 *    API key connection and report it as broken.
 *  - **`GET /permissions?resource_id=...`** is documented to "answer for
 *    whichever identity authenticated the request — a user session, an OAuth
 *    token, or an account or app API key" — explicitly uniform across every
 *    credential shape this Auth accepts — and needs no permission scope of
 *    its own ("It answers only your own access"). Measured live: a missing or
 *    fake bearer token both answer a clean `401
 *    {"error":{"type":"unauthorized","message":"Authentication failed"}}`,
 *    which distinguishes "invalid credential" from every other failure mode.
 *    Its response is a list of `{action, granted}` booleans — nothing
 *    credential-shaped to leak — and this hook never reads the body on
 *    success in any case.
 *
 * `resource_id` cannot be an arbitrary constant string: it must be one of the
 * `biz_`/`prod_`/`exp_`/`app_` tag families. Whop's own docs promise a
 * resource the credential cannot see is "reported as granted nothing rather
 * than as an error," so `accountId` need not literally be readable by the
 * caller — it only has to be well-formed. This app cannot verify that promise
 * without a live key, so `test` treats an unexpected 4xx here as `unknown`
 * (a probe-design question) rather than as a rejected credential, and only a
 * clean `401` is ever reported as a bad key.
 */

export interface WhopCredential {
  apiKey: string;
  accountId: string;
}

/** The one place the wire format is built — `test` and `sign` share it. */
export function authHeaders(credential: Partial<WhopCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module doc for why this endpoint and not `/users/me`. */
export const PROBE_PATH = "/permissions";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an Account or App API key from your Whop dashboard (Developer > API Keys, or " +
    "Developer > Apps for an app-scoped key), plus the Whop account ID (biz_...) this " +
    "connection acts as.",
  connectionLabel: "Whop ({{accountId}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Whop dashboard > Developer > API Keys (account key) or Developer > Apps (app key).",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      placeholder: "biz_xxxxxxxxxxxxxx",
      hint: "The biz_... account this connection acts as. Used to scope list actions that " +
        "require an account_id and as the target of the connection health check.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<WhopCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not `/users/me`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<WhopCredential>;
    const token = (cred?.apiKey ?? "").trim();
    const accountId = (cred?.accountId ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };
    if (!accountId) return { ok: false, message: "credential missing accountId" };

    const url = new URL(`${API_BASE}${PROBE_PATH}`);
    url.searchParams.set("resource_id", accountId);
    const res = await ctx.fetch(url.toString(), {
      headers: {
        accept: "application/json",
        "api-version-date": API_VERSION_DATE,
        ...authHeaders({ apiKey: token }),
      },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { type?: string; message?: string } }
      | null;
    const type = body?.error?.type;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Whop rejected the API key (401${type ? ` ${type}` : ""}). Check it was ` +
          "copied exactly and has not been revoked in Whop dashboard > Developer > API Keys.",
      };
    }
    // Anything else (400/403/404/5xx) is left `unknown` rather than "bad key":
    // it may mean accountId does not resolve as a tag this deployment expects,
    // which is a probe-design question, not proof the credential is dead.
    return {
      ok: false,
      message: `Whop returned HTTP ${res.status}${type ? ` (${type})` : ""} for ${PROBE_PATH} — ` +
        "this may reflect the accountId rather than the API key.",
    };
  },

  /**
   * Echo `accountId` (never `apiKey`) into the non-secret display metadata, so
   * an Action's `ctx.connection?.display?.accountId` can default to the
   * connection's own account instead of forcing every call to repeat it. No
   * network call needed — the value is already known from the connect form.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<WhopCredential>;
    const accountId = (cred?.accountId ?? "").trim();
    return Promise.resolve(accountId ? { accountId } : {});
  },
};

export default apiKey;
