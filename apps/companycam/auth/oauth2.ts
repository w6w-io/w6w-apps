import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { explainProbeFailure, PROBE_PATH } from "./access-token.ts";

/**
 * OAuth 2.0 authorization code flow — the path for an integration used by
 * companies other than your own.
 *
 * Transcribed from CompanyCam's OAuth guide (`docs.companycam.com/docs/oauth`,
 * fetched 2026-08-11). Three details from it shape this file:
 *
 *  - **The OAuth endpoints are not on the API host.** Authorization and token
 *    exchange both live on `app.companycam.com`, while every API call goes to
 *    `api.companycam.com`. The runtime allowlists an `oauth2` method's endpoint
 *    hosts implicitly, so `app.companycam.com` deliberately does not appear in
 *    `w6w.network.allow` — the app itself never calls it.
 *  - **Three scopes, space-delimited**: `read`, `write`, `destroy`. That is the
 *    entire vocabulary; there is no per-resource scope. `destroy` is requested
 *    because this app exposes the documented delete endpoints, and CompanyCam
 *    grants what is asked for at authorization time — a connection made without
 *    it would fail only later, at the first delete.
 *  - **Tokens expire in 7,200 seconds and refresh tokens rotate.** The guide is
 *    explicit: "Each time you request a new `access_token`, you will receive a
 *    new `refresh_token` as well. Please make sure to update both." Declaring
 *    `refreshUrl` hands that to the host, which is the only component that can
 *    store the rotated pair.
 *
 * PKCE is **not** enabled. The guide documents a confidential client that sends
 * `client_secret` on the token request and never mentions `code_challenge`, and
 * an authorization server that ignores a PKCE parameter it does not know about
 * would silently drop the protection rather than announce it.
 *
 * Registering a client requires CompanyCam to issue a client id and secret; the
 * guide points at a Google Form. Those values live on the w6w server, never in
 * this package.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with CompanyCam)",
  description:
    "Public OAuth flow. Requires a CompanyCam OAuth client (client_id / client_secret / " +
    "redirect_uri) registered with CompanyCam and configured on this w6w installation.",
  connectionLabel: "CompanyCam ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://app.companycam.com/oauth/authorize",
    tokenUrl: "https://app.companycam.com/oauth/token",
    refreshUrl: "https://app.companycam.com/oauth/token",
    scopes: ["read", "write", "destroy"],
    pkce: false,
  },

  /**
   * The only hook handed the raw credential. An OAuth access token is presented
   * exactly like an access token from the CompanyCam app — same header, same
   * scheme, same endpoints.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * Same probe as `auth/access-token.ts`, deliberately: `GET /v2/users/current`
   * is reachable with the narrowest scope CompanyCam issues (`read`), requires
   * a credential, and returns nothing secret. Sharing the classifier keeps the
   * two methods from drifting into telling a user two different stories about
   * the same 401.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    const token = (accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text().catch(() => "");
    return { ok: false, message: explainProbeFailure(res.status, contentType, body) };
  },

  /**
   * Publish the authorizing user's email and name for the connection label.
   * The request is signed by the host here, so no credential is read.
   *
   * Silent on failure for the same reason as the access-token method: `test`
   * has already proved the token is live.
   */
  async afterConnect(_input, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return {};
      const user = await res.json() as {
        id?: string;
        email_address?: string;
        first_name?: string;
        last_name?: string;
        company_id?: string;
      };
      const email = user?.email_address;
      if (!email) return {};
      const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
      return {
        user: { id: user.id, email, name: name || undefined, companyId: user.company_id },
      };
    } catch {
      return {};
    }
  },
};

export default oauth2;
