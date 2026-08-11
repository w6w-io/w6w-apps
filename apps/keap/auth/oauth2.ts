import type { AuthDefinition } from "@w6w/types";
import { fetchUserInfo, probeCredential } from "./probe.ts";

/**
 * OAuth 2.0 Authorization Code, with a Keap developer application.
 *
 * Register an app at https://keys.developer.keap.com, store its
 * `client_id` / `client_secret` / `redirect_uri` on this w6w installation, and
 * a user connects by signing into their own Keap app and approving it.
 *
 * Verified 2026-08-11 against Keap's own OAuth guide
 * (`developer.keap.com/getting-started-oauth-keys/`) and the
 * `components.securitySchemes.oauth2` block of both OpenAPI documents, which
 * declare the same two endpoints.
 *
 * ## One scope, and it is `full`
 *
 * Keap's documented `scope` parameter has exactly one valid value: "The only
 * current valid value is `scope=full`. Defaults to full." There is no
 * least-privilege OAuth story on this API — an approved integration can read
 * and write everything the authorizing user can. That is worth knowing before
 * you connect one, and it is why the health-check probe below is chosen for
 * *credential-type* reasons rather than scope reasons.
 *
 * ## The refresh request is not shaped like the initial one
 *
 * This is the detail that costs a day. Both go to the same URL,
 * `POST https://api.infusionsoft.com/token`, both are
 * `application/x-www-form-urlencoded`, and they authenticate the client in two
 * different ways:
 *
 *  - **Code exchange** — `client_id` and `client_secret` in the **form body**,
 *    alongside `code`, `grant_type=authorization_code` and `redirect_uri`.
 *  - **Refresh** — `grant_type=refresh_token` and `refresh_token` in the body,
 *    and the client credentials in an **HTTP Basic `Authorization` header**:
 *    Keap's own pseudo-code is `Basic + base64_encode(CLIENT_ID + ':' +
 *    CLIENT_SECRET)`. Keap documents no body-parameter form for the refresh
 *    grant.
 *
 * A host that reuses the body form for the refresh grant gets a working
 * connection that silently stops working when the first access token expires.
 * No `refresh` hook is declared here because an App is never handed the client
 * secret — the host holds it, so the host performs the refresh, and this note
 * is the App telling it how.
 *
 * ## Refresh tokens rotate
 *
 * Keap: "Once a Refresh Token is used to receive a new Access Token, you will
 * be returned a new Refresh Token as well, which will need to be persisted in
 * order to request the next access token." Keeping the original refresh token
 * after a refresh permanently breaks the Connection.
 *
 * ## PKCE
 *
 * Set `false` explicitly. Keap's authorization request documents exactly four
 * query parameters — `client_id`, `redirect_uri`, `response_type`, `scope` —
 * and neither `code_challenge` nor `code_challenge_method` appears in the guide
 * or in either OpenAPI document's `authorizationCode` flow object. The token
 * request is authenticated with the client secret, i.e. a confidential client.
 * `pkce` defaults to `true` in `@w6w/types`, so leaving it unset would send
 * Keap a parameter it has never said it handles; that is a guess, and the
 * conservative reading is not to make it. This is an absence of documentation,
 * not documented absence of support — if Keap publishes PKCE support, flipping
 * this to `true` is a one-line change.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Keap)",
  description:
    "Public OAuth flow. Requires a Keap developer application (client id and secret) registered " +
    "on this w6w installation. Grants full access to the authorizing user's Keap app — Keap " +
    "publishes no narrower scope.",
  connectionLabel: "Keap — {{name}} ({{tenantId}})",
  oauth2: {
    authorizationUrl: "https://accounts.infusionsoft.com/app/oauth/authorize",
    tokenUrl: "https://api.infusionsoft.com/token",
    // Keap's only documented scope. Sending anything else is undefined behaviour.
    scopes: ["full"],
    pkce: false,
  },

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   *
   * Keap accepts the credential in exactly one place — `Authorization: Bearer`.
   * Unlike several APIs in this pack there is no `?access_token=` query form to
   * be tempted by, so there is nothing here to get wrong.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /** See `auth/probe.ts` for why this endpoint, and why the body decides. */
  test({ credential }, ctx) {
    const { accessToken } = (credential ?? {}) as { accessToken?: string };
    const token = (accessToken ?? "").trim();
    if (!token) return Promise.resolve({ ok: false, message: "credential missing accessToken" });
    return probeCredential({ authorization: `Bearer ${token}` }, ctx, "Keap");
  },

  /**
   * Publish who and which Keap app this Connection speaks for.
   *
   * `tenant_id` is the field that matters: one OAuth client is routinely
   * connected to several Keap apps, and a list of Connections that all read
   * "Keap" is unusable. Nothing secret is kept — see `auth/probe.ts`.
   */
  afterConnect({ credential }, ctx) {
    const { accessToken } = (credential ?? {}) as { accessToken?: string };
    if (!accessToken) return Promise.resolve({});
    return fetchUserInfo({ authorization: `Bearer ${accessToken}` }, ctx);
  },
};

export default oauth2;
