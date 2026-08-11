import type { AuthDefinition } from "@w6w/types";
import {
  helixAuthHeaders,
  postGrant,
  refreshable,
  type TwitchCredential,
  validateToken,
} from "./shared.ts";

/**
 * **App access token** — the client-credentials grant. Server-to-server, no
 * user, no scopes.
 *
 * Twitch's own framing (dev.twitch.tv/docs/authentication/, read 2026-08-11):
 * "APIs that don't require the user's permission to access resources use app
 * access tokens… To get an app access token, use the client credentials grant
 * flow." The grant is one POST to `id.twitch.tv/oauth2/token` with
 * `client_id`, `client_secret` and `grant_type=client_credentials`, and it
 * answers `{"access_token", "expires_in", "token_type"}` — no refresh token,
 * because you re-mint rather than refresh.
 *
 * ## What this reaches, and what it does not
 *
 * Of the 149 endpoints in Twitch's API reference, 29 are documented as
 * "Requires an app access token or user access token" with no scope. This
 * method reaches exactly those (this app ships 20 of them, see README). It does
 * NOT reach anything about a specific broadcaster's own data — followers,
 * moderators, sending chat, editing a channel — because Twitch gates those on a
 * *user* token carrying a scope that user consented to. Use
 * `auth/user-access-token.ts` for those; the two are not interchangeable, and
 * the reference marks the requirement per endpoint.
 *
 * ## Why `custom` rather than `oauth2`
 *
 * The client-credentials grant is not one of the flows the platform's `oauth2`
 * type drives (it drives the authorization-code redirect), and the credential
 * has to carry the client id for `sign` to send `Client-Id`. Both point the
 * same way: `custom`, with the fields collected directly.
 *
 * ## The token is minted once, by the user, and renewed here
 *
 * An app access token lives roughly 60 days (`expires_in` was 5,011,271 seconds
 * in the vendor's own example). The user pastes the first one — one `curl`,
 * shown in the field hint — and the `refresh` hook re-mints from the stored
 * client id and secret without asking again. Storing the secret is what makes
 * that possible; a connection may leave it out, in which case renewal is
 * manual and {@link refreshable} says so.
 */
const appAccessToken: AuthDefinition = {
  key: "app-access-token",
  type: "custom",
  displayName: "App Access Token (client credentials)",
  description:
    "Server-to-server access with no Twitch user attached. Reaches every endpoint Twitch marks " +
    '"app access token or user access token" — channels, streams, videos, clips, games, search, ' +
    "chat metadata, schedules and teams. It cannot read a broadcaster's followers or moderators, " +
    "send chat, or edit a channel: those need a user access token.",
  connectionLabel: "Twitch app ({{clientIdPrefix}}…)",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      placeholder: "uo6dggojyb8d6soh92zknwmi5ej1q2",
      hint: "From your app's page in the Twitch Developer Console (dev.twitch.tv/console/apps). " +
        "Not a secret — Twitch sends it in a header on every request — but it must be the client " +
        "the access token below was minted for, or every call fails with a 401.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      hint: 'From the same page, via "New Secret". Generating a new secret invalidates the old ' +
        "one. It is stored so this connection can re-mint its own access token when the current " +
        "one expires, which is roughly every 60 days.",
    },
    {
      key: "accessToken",
      label: "App Access Token",
      type: "secret",
      required: true,
      hint: "Mint one with: curl -X POST https://id.twitch.tv/oauth2/token -d " +
        '"client_id=…&client_secret=…&grant_type=client_credentials" — then paste the ' +
        "access_token from the response. It is renewed automatically from here on.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the two headers Helix needs and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<TwitchCredential>;
    for (const [name, value] of Object.entries(helixAuthHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Validate the token, and check it is the KIND this method claims.
   *
   * Two assertions beyond "is it live", both of which catch a real
   * misconfiguration that would otherwise surface as an unexplained 401 in the
   * middle of a workflow run:
   *
   *  - **`client_id` must equal the stored client id.** Twitch will happily
   *    accept a token from one app and a `Client-Id` from another at connect
   *    time — the mismatch is only rejected by Helix, per request. Comparing
   *    here turns a confusing runtime failure into a connect-time message.
   *  - **`user_id` must be null.** A user token pasted into this method would
   *    validate fine and then quietly fail on every endpoint that needs an app
   *    token, and succeed on ones this method's description promises it cannot
   *    reach. Twitch documents the discriminator: "If the access token is an App
   *    Access Token, this field will be null."
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TwitchCredential>;
    const token = (cred?.accessToken ?? "").trim();
    const clientId = (cred?.clientId ?? "").trim();
    if (!token) return { ok: false, message: "credential is missing accessToken" };
    if (!clientId) return { ok: false, message: "credential is missing clientId" };

    const outcome = await validateToken(ctx, token);
    if (!outcome.ok) {
      if (outcome.status === 401) {
        return {
          ok: false,
          message:
            `Twitch rejected the token (401 ${outcome.message}). App access tokens expire after ` +
            "roughly 60 days; mint a new one with the client-credentials grant.",
        };
      }
      return {
        ok: false,
        message: `Twitch token validation returned ${outcome.status}: ${outcome.message}`,
      };
    }

    const info = outcome.result ?? {};
    if (info.client_id && info.client_id !== clientId) {
      return {
        ok: false,
        message:
          "the access token belongs to a different Twitch application than the Client ID given " +
          "here. Helix rejects that pairing on every request — paste the token minted for this " +
          "client, or correct the Client ID.",
      };
    }
    if (info.user_id) {
      return {
        ok: false,
        message:
          `this is a USER access token (it identifies ${info.login ?? info.user_id}), not an app ` +
          'access token. Connect it with the "User Access Token" method instead, which is the ' +
          "one that can reach a broadcaster's own data.",
      };
    }
    return { ok: true };
  },

  /**
   * Label the connection by the leading characters of the client id.
   *
   * Deliberately partial. The client id is not a secret, but a Connection list
   * is a screen people screenshot, and the first eight characters are enough to
   * tell two apps apart without publishing the whole identifier. Nothing else
   * about an app token identifies it — there is no user, no login, no email.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<TwitchCredential>;
    const clientId = (cred?.clientId ?? "").trim();
    if (!clientId) return {};
    return { clientIdPrefix: clientId.slice(0, 8) };
  },

  /**
   * Re-mint, because a client-credentials token has no refresh token.
   *
   * Twitch's grant answers `{access_token, expires_in, token_type}` and nothing
   * else, so renewal is the same POST that produced the first token. The old
   * token is simply replaced; Twitch does not require revoking it, and the
   * previous one keeps working until it expires on its own.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<TwitchCredential>;
    if (!refreshable(cred)) {
      throw new Error(
        "cannot renew this connection: it has no stored Client ID and Client Secret. Reconnect " +
          "with both, or paste a freshly minted app access token.",
      );
    }
    const grant = await postGrant(ctx, {
      client_id: cred.clientId!,
      client_secret: cred.clientSecret!,
      grant_type: "client_credentials",
    });
    return { ...cred, accessToken: grant.access_token } as TwitchCredential;
  },
};

export default appAccessToken;
