import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * ClickSend uses HTTP Basic auth: an API username as the username and an API key as
 * the password (the blueprint's "Authentication" section also allows the dashboard
 * account username/password pair, but the API credentials are what ClickSend's own
 * docs recommend and what every example in the reference uses).
 *
 * ## The probe is NOT `GET /account`
 *
 * `GET /account` is the obvious whoami and is what `account-get.ts` calls as an
 * Action — but its response embeds `_subaccount.api_key`, a **live, working API key**
 * for the subaccount, verified live on 2026-08-24. A health probe's response is
 * stored and displayed on every check; reusing that endpoint here would copy a
 * working credential into the health surface on every run, forever. Follow Up
 * Boss's `/me` and Mailjet's `/apikey` are the same trap, and both are already
 * banned pack-wide.
 *
 * `GET /account/usage/{year}/{month}/subaccount` is used instead: it requires a live
 * credential (verified: unauthenticated and wrong-credential requests both answer
 * `401 UNAUTHORIZED`), it needs no resource-scoped access, and its response is a pure
 * usage-count/price rollup — no credential material anywhere in the schema. The
 * blueprint's own parameter doc says `type` may be `"subaccount"` *or* `"email"`;
 * live testing on 2026-08-24 showed `email` (and every other channel name) rejected
 * with `400 {"response_msg":"Type must be 'subaccount' only."}` — the doc is wrong,
 * and `subaccount` is the only value the API actually accepts.
 *
 * ## Missing, wrong, and inactive all look identical
 *
 * Verified live on 2026-08-24 against ClickSend's own documented test accounts
 * (blueprint "Testing" section): a request with **no** Authorization header, one
 * with a syntactically plausible but wrong API key, and the `notactive` test account
 * (a real, correctly-authenticated but not-yet-activated account) all answer the
 * byte-identical `401 {"http_code":401,"response_code":"UNAUTHORIZED","response_msg":"Authorization failed.","data":null}`.
 * There is no way to tell "you typed the key wrong" from "your account was
 * deactivated after the connection was made" — the `test` hook below says so
 * explicitly rather than guessing.
 *
 * The `banned` test account is the one case that DOES differ: a real, live
 * credential whose account has been suspended answers `403 FORBIDDEN` with
 * `"Your account is suspended. Please contact support for more information."` — a
 * problem the credential itself cannot fix, so it is reported with that message
 * verbatim instead of folded into the generic "check your API key" text.
 */

export interface ClickSendCredential {
  username: string;
  apiKey: string;
}

/** The one place the Basic auth header is built, shared by `sign` and `test`. */
export function authHeader(credential: Partial<ClickSendCredential>): string {
  const username = credential.username ?? "";
  const apiKey = credential.apiKey ?? "";
  return `Basic ${btoa(`${username}:${apiKey}`)}`;
}

/**
 * The credential-liveness probe path. `type` must be the literal string
 * `"subaccount"` — see the module doc above for why `"email"` (the blueprint's other
 * documented option) is rejected live.
 */
export function usagePath(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // ClickSend's month parameter is 1-indexed.
  return `/account/usage/${year}/${month}/subaccount`;
}

interface ClickSendErrorBody {
  response_code?: string;
  response_msg?: string;
}

const basicAuth: AuthDefinition = {
  key: "basic-auth",
  type: "basic",
  displayName: "API Credentials",
  description:
    "Authenticate with your ClickSend API username and API key from Dashboard → API Credentials " +
    "(top right of the dashboard). Your dashboard login username/password also works, but a " +
    "dedicated API credential is recommended.",
  connectionLabel: "ClickSend ({{username}})",
  fields: [
    {
      key: "username",
      label: "API Username",
      type: "string",
      required: true,
      hint: "ClickSend Dashboard → API Credentials.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "ClickSend Dashboard → API Credentials. Treat this like a password.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps the
   * Basic auth header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ClickSendCredential>;
    request.headers["authorization"] = authHeader(cred);
    return request;
  },

  /** See the module doc for why this endpoint, and why 401 cannot be split further. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ClickSendCredential>;
    const username = (cred?.username ?? "").trim();
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!username || !apiKey) {
      return { ok: false, message: "credential missing username or apiKey" };
    }

    const res = await ctx.fetch(`${API_BASE}${usagePath()}`, {
      headers: { accept: "application/json", authorization: authHeader({ username, apiKey }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as ClickSendErrorBody | null;

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "ClickSend rejected the credential (401 UNAUTHORIZED). ClickSend does not distinguish " +
          "a wrong API key from an account that has not been activated — check the API " +
          "Username and API Key were copied exactly from Dashboard → API Credentials, and " +
          "that the account is active.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `ClickSend account suspended: ${
          body?.response_msg ?? "contact ClickSend support."
        }`,
      };
    }
    return {
      ok: false,
      message: `ClickSend returned HTTP ${res.status}${
        body?.response_msg ? `: ${body.response_msg}` : ""
      } for the usage probe.`,
    };
  },
};

export default basicAuth;
