import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * TikTok for Business Access Token.
 *
 * ## Header, confirmed live
 *
 * TikTok's official multi-language SDK (github.com/tiktok/tiktok-business-api-sdk,
 * `python_sdk/business_api_client/api/authentication_api.py`) sends the token
 * as `header_params['Access-Token']` — exact casing confirmed there, and
 * confirmed live: calling any real route on `business-api.tiktok.com` with a
 * syntactically-fake `Access-Token` header returns TikTok's structured
 * `{"code":40105,"message":"Access token is incorrect or has been revoked."}`
 * body rather than a "missing credential" error, so the header name and shape
 * are recognized before the value is even checked.
 *
 * ## Why `appId`/`appSecret` are collected too
 *
 * The only credential-liveness probe this app could confirm as both real and
 * scope-independent — `GET /open_api/v1.3/oauth2/advertiser/get/` (see
 * `test` below) — takes the OAuth app's own `app_id`/`secret` as query
 * parameters *alongside* the user's `Access-Token` header (confirmed against
 * the same SDK method: `oauth2_advertiser_get(app_id, secret, access_token)`).
 * TikTok's own OAuth model requires all three for this call, so they are
 * collected here rather than invented as extra fields with no purpose: an app
 * registers with TikTok for Business, gets an App ID + App Secret, and a user
 * authorizes it to mint the long-lived `Access-Token` this credential stores.
 */
export interface TikTokCredential {
  appId: string;
  appSecret: string;
  accessToken: string;
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description:
    "Paste the App ID and App Secret of your TikTok for Business developer app, and the " +
    "long-lived Access Token minted for the account that authorized it (Business API portal " +
    "> My Apps > your app > Authorized Accounts).",
  connectionLabel: "TikTok ({{appId}})",
  apiKey: { in: "header", name: "Access-Token" },
  fields: [
    {
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      hint:
        "From business-api.tiktok.com/portal/apps — the App ID (Client Key) of your registered app.",
    },
    {
      key: "appSecret",
      label: "App Secret",
      type: "secret",
      required: true,
      hint: "The App Secret (Client Secret) paired with the App ID above.",
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "The long-lived Access Token TikTok issued after this app's OAuth flow authorized " +
        "an account.",
    },
  ],

  /**
   * The only hook handed the raw credential. Runs network-less: it stamps the
   * header and returns — it never calls `ctx.fetch` itself.
   */
  sign({ request, credential }) {
    const { accessToken: token } = credential as TikTokCredential;
    request.headers["access-token"] = token;
    return request;
  },

  /**
   * `GET /open_api/v1.3/oauth2/advertiser/get/` — confirmed live 2026-09-05
   * as a real route (structured auth-error body, not a bare 404) and
   * confirmed against TikTok's own SDK as "get the advertiser accounts that
   * authorized this app's access token", which needs no `advertiser_id` or
   * `business_id` of its own — the narrowest usable credential (this
   * connection's three fields, nothing scoped further) can always reach it.
   * None of the four Lead Generation routes this app calls could be used
   * instead: every one of them needs a scope id (`advertiser_id` or a Page's
   * `business_id`) this Auth method does not collect, so probing them would
   * make a live credential missing only that scope report as broken.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TikTokCredential>;
    const appId = (cred.appId ?? "").trim();
    const appSecret = (cred.appSecret ?? "").trim();
    const token = (cred.accessToken ?? "").trim();
    if (!appId || !appSecret || !token) {
      return { ok: false, message: "credential is missing appId, appSecret, or accessToken" };
    }

    const url = new URL(`${API_BASE}${API_PREFIX}/oauth2/advertiser/get/`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("secret", appSecret);

    const res = await ctx.fetch(url.toString(), {
      headers: { accept: "application/json", "access-token": token },
    });

    const body = await res.json().catch(() => null) as
      | { code?: number; message?: string }
      | null;
    if (!body) {
      return { ok: false, message: `TikTok returned a non-JSON response (HTTP ${res.status})` };
    }

    if (body.code === 0) return { ok: true };

    if (body.code === 40105) {
      return {
        ok: false,
        message: "TikTok rejected the Access Token (code 40105: incorrect or revoked). " +
          "Reconnect with a fresh token from the Business API portal.",
      };
    }
    if (body.code === 40001 || body.code === 40002) {
      return {
        ok: false,
        message: `TikTok rejected the App ID/App Secret pair (code ${body.code}${
          body.message ? `: ${body.message}` : ""
        }).`,
      };
    }
    return {
      ok: false,
      message: `TikTok returned code ${body.code}${body.message ? `: ${body.message}` : ""}`,
    };
  },
};

export default accessToken;
