import type { AuthDefinition } from "@w6w/types";
import {
  helixAuthHeaders,
  postGrant,
  refreshable,
  type TwitchCredential,
  validateToken,
} from "./shared.ts";

/**
 * **User access token** — a token a Twitch user consented to, carrying scopes.
 *
 * This is the token kind everything about a *specific* broadcaster needs: their
 * follower list, their moderators, sending a chat announcement, editing their
 * channel, clipping their stream. Twitch's reference marks the requirement per
 * endpoint, and the two kinds are not interchangeable in that direction — an
 * app access token is refused by every one of them.
 *
 * ## Why this is `custom` and not the platform's `oauth2` type
 *
 * Twitch's authorization-code flow is a textbook OAuth 2.0 flow and the
 * platform's `oauth2` type drives it correctly — right up to the point where
 * the request goes out. A Helix request needs `Client-Id` as well as the bearer
 * token, `sign` is the only hook allowed to add either, and `sign` receives
 * exactly two things: the request and the credential. It gets no
 * `ctx.connection`, and the credential blob a host stores after an
 * authorization-code exchange is the normalised
 * `{accessToken, refreshToken, expiresAt, scope, tokenType}` — which does not
 * carry the client id, because for every other vendor in this pack it is not
 * needed on the wire.
 *
 * So an `oauth2`-typed Twitch method would produce requests with a bearer token
 * and no `Client-Id`, and Twitch answers those with `401 Unauthorized`. Rather
 * than ship an auth method that cannot sign a single request, this method
 * collects the token the user already minted, alongside the client id it was
 * minted for. Twitch's own tooling makes that a one-liner: `twitch token -u -s
 * "<scopes>"` in the Twitch CLI prints an access token and a refresh token.
 *
 * The alternative — teaching the host that some vendors need extra credential
 * material from the OAuth installation — is a platform change, not an app
 * change, and is noted in the README as the thing that would let this method
 * become a real `oauth2` one.
 *
 * ## Refresh matters here in a way it does not for an app token
 *
 * A user access token is short-lived: `expires_in` was 14,124 seconds — under
 * four hours — in Twitch's own documented example. The refresh token lives
 * until the user disconnects the integration or changes their password. So the
 * `refresh` hook is load-bearing, and the connection stores the client secret so
 * it can run unattended.
 *
 * Twitch's refresh tokens are **single-use** for the device-code flow and
 * rotated on every grant, so this hook stores whatever new `refresh_token`
 * comes back rather than keeping the original.
 *
 * ## Scopes are the user's, not this app's
 *
 * Nothing here requests scopes: the token arrives with whatever the user
 * consented to. `test` reports them, so a connection that is missing
 * `moderator:read:followers` says so at connect time rather than failing inside
 * a run. Each action that needs a scope names it in its own description.
 */
const userAccessToken: AuthDefinition = {
  key: "user-access-token",
  type: "custom",
  displayName: "User Access Token",
  description:
    "A token a Twitch user authorized, carrying that user's scopes. Needed for anything about a " +
    "specific broadcaster — followers, moderators, sending chat, editing the channel, creating " +
    "clips — and it also reaches everything an app access token can. Mint one with the Twitch " +
    'CLI (twitch token -u -s "<scopes>") or your own authorization-code flow.',
  connectionLabel: "Twitch ({{login}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      placeholder: "uo6dggojyb8d6soh92zknwmi5ej1q2",
      hint: "The client ID of the Twitch application the token was minted for. Twitch rejects " +
        "every request where this and the token disagree, so it is checked when you connect.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      hint: "Needed to exchange the refresh token below. User access tokens expire in about four " +
        "hours, so without this the connection stops working the same afternoon.",
    },
    {
      key: "accessToken",
      label: "User Access Token",
      type: "secret",
      required: true,
      hint: "The access_token from an authorization-code (or device-code) grant. Its scopes are " +
        "whatever the user consented to; this connection reports them back to you when it is " +
        "tested.",
    },
    {
      key: "refreshToken",
      label: "Refresh Token",
      type: "secret",
      required: true,
      hint: "The refresh_token from the same grant. It is exchanged for a new access token when " +
        "the current one expires, and Twitch rotates it each time.",
    },
  ],

  /** The only hook handed the raw credential, and it runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<TwitchCredential>;
    for (const [name, value] of Object.entries(helixAuthHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Validate, then assert this really is a user token for this client.
   *
   * The `user_id` check is the mirror of the one in the app-token method, and
   * catches the more damaging mistake of the two: an app access token pasted
   * here validates cleanly and then fails on every action this method exists
   * for, with a 401 that says nothing about why.
   *
   * A token with no scopes is reported but NOT failed. It is a legitimate
   * configuration — every no-scope endpoint still works — and failing it would
   * break a connection whose owner only wants the public reads.
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
            `Twitch rejected the token (401 ${outcome.message}). User access tokens expire in ` +
            "about four hours, and are invalidated when the user disconnects the integration or " +
            "changes their password — exchange the refresh token, or reconnect.",
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
    if (!info.user_id) {
      return {
        ok: false,
        message:
          "this is an APP access token, not a user access token: Twitch reports no user for it. " +
          'Connect it with the "App Access Token" method, or mint a user token via the ' +
          "authorization-code flow.",
      };
    }
    const scopes = info.scopes ?? [];
    if (scopes.length === 0) {
      return {
        ok: true,
        message:
          "the token carries no scopes, so only the endpoints that need none are reachable — " +
          "the same set an app access token reaches.",
      };
    }
    return { ok: true, message: `scopes: ${scopes.join(", ")}` };
  },

  /**
   * Publish the authorising user's login, id and scopes, and nothing else.
   *
   * All three come from the same `/oauth2/validate` call the probe uses, so this
   * adds no new endpoint and no new class of data. The login is what makes a
   * list of connections readable; the scopes are what make "why did that action
   * 401" answerable without a support ticket.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not break a good connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TwitchCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return {};
    const outcome = await validateToken(ctx, token);
    if (!outcome.ok || !outcome.result) return {};
    const { login, user_id, scopes } = outcome.result;
    if (!login) return {};
    return { login, userId: user_id ?? undefined, scopes: scopes ?? [] };
  },

  /**
   * Exchange the refresh token for a new access token.
   *
   * The standard `grant_type=refresh_token` request. Twitch returns a NEW
   * refresh token each time and the old one stops working, so the returned
   * credential carries the new one — keeping the original is the classic way a
   * refresh loop works once and then never again.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<TwitchCredential>;
    if (!refreshable(cred) || !cred.refreshToken) {
      throw new Error(
        "cannot renew this connection: it needs a Client ID, Client Secret and Refresh Token. " +
          "Reconnect with all three.",
      );
    }
    const grant = await postGrant(ctx, {
      client_id: cred.clientId!,
      client_secret: cred.clientSecret!,
      grant_type: "refresh_token",
      refresh_token: cred.refreshToken,
    });
    return {
      ...cred,
      accessToken: grant.access_token,
      refreshToken: grant.refresh_token ?? cred.refreshToken,
    } as TwitchCredential;
  },
};

export default userAccessToken;
