import type { AuthDefinition } from "@w6w/types";
import { API_HOST } from "../lib/client.ts";

/**
 * Channel access token — `Authorization: Bearer <channel access token>`.
 *
 * Verified against the vendor's reference source (see `lib/client.ts`'s module doc) and live
 * probes against `api.line.me` on 2026-09-05.
 *
 * ## Which token, and why this one
 *
 * LINE documents four ways to obtain a channel access token: a **long-lived** one (minted once by
 * hand in the LINE Developers Console, no expiry until revoked), a **short-lived** one (30 days,
 * `POST /v2/oauth/accessToken` from a channel id + secret), a **stateless** one (15 minutes,
 * `POST /oauth2/v3/token`), and a **v2.1** one with a caller-chosen expiry (`POST
 * /oauth2/v2.1/token`, needs a JWT assertion signed with a private key registered to the channel).
 *
 * This app supports only the first: the user pastes a long-lived token from the Console. The other
 * three are all *issuance* flows this app deliberately does not implement — see `README.md` §
 * "Deliberately not covered" for why (in short: the three programmatic ones expire on a schedule
 * this app has no background process to renew against, and the one with a useful expiry needs
 * private-key JWT signing, which is out of reach for a credential-only, network-less `sign` hook).
 * A long-lived token is also what every other first-party LINE integration (Zapier, Make, n8n)
 * asks for, for the same reason.
 *
 * ## Header, never a query parameter
 *
 * Every documented endpoint in this app's surface takes the token as
 * `Authorization: Bearer <token>`. LINE's OAuth *token-management* endpoints (verify, revoke) take
 * it as a request-body field instead, but this app does not call those — see README.
 */

export interface LineCredential {
  channelAccessToken: string;
}

/** The one place the wire format is built, so `sign` and `test` share it. */
export function authHeaders(credential: Partial<LineCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.channelAccessToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/bot/info`.
 *
 * Chosen by reading the response schema, not the name, and confirmed live on 2026-09-05:
 *
 * - **It requires a credential.** Unauthenticated it answers
 *   `401 {"message":"Authorization header required. ..."}`; with a syntactically plausible but
 *   fake token it answers a *different* `401`,
 *   `{"message":"Authentication failed. Confirm that the access token in the authorization header
 *   is valid."}` — LINE's own error taxonomy distinguishes "never arrived" from "rejected", which
 *   `test` below reports rather than collapsing.
 * - **It returns no credential material.** The documented response is
 *   `{userId, basicId, premiumId?, displayName, pictureUrl?, chatMode, markAsReadMode}` — the
 *   Official Account's own public identity, nothing that could be replayed as a credential. This
 *   is the same reasoning that rules out an app's `/me`-shaped endpoint elsewhere in this pack
 *   (Follow Up Boss's `/me`, Mailjet's `/apikey`) when that endpoint instead echoes the caller's own
 *   key — bot info does not.
 * - **It needs no scope beyond a working token.** LINE channel access tokens are not scoped by
 *   endpoint the way an Apify or GitHub token is, so there is no "narrowest usable credential"
 *   concern here — any live token reaches it.
 */
export const PROBE_PATH = "/v2/bot/info";

const channelAccessToken: AuthDefinition = {
  key: "channel-access-token",
  type: "bearer",
  displayName: "Channel Access Token",
  description: "Paste a long-lived channel access token from the LINE Developers Console " +
    "(your channel > Messaging API tab > Channel access token > Issue).",
  connectionLabel: "LINE ({{displayName}})",
  fields: [
    {
      key: "channelAccessToken",
      label: "Channel Access Token",
      type: "secret",
      required: true,
      hint: "developers.line.biz/console > your provider > your channel > Messaging API tab > " +
        'Channel access token > "Issue" (long-lived, no expiry until you revoke it).',
    },
  ],

  /** The only hook handed the raw credential, and it runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<LineCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LineCredential>;
    const token = (cred?.channelAccessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing channelAccessToken" };

    const res = await ctx.fetch(`${API_HOST}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ channelAccessToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const message = body?.message;

    if (res.status === 401 && /authorization header required/i.test(message ?? "")) {
      return {
        ok: false,
        message: "LINE received no token. The credential did not reach the request — reconnect " +
          "this connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `LINE rejected the token: ${message ?? "authentication failed"}. Confirm it was ` +
          "copied in full and has not been reissued or revoked in the Developers Console.",
      };
    }
    return {
      ok: false,
      message: `LINE returned HTTP ${res.status} for ${PROBE_PATH}${message ? `: ${message}` : ""}`,
    };
  },

  /**
   * Publish the Official Account's own display name — the same read `test` already trusts,
   * projected into the connection label instead of a bare "LINE".
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LineCredential>;
    try {
      const res = await ctx.fetch(`${API_HOST}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { displayName?: string; basicId?: string };
      if (!body?.displayName) return {};
      return body.basicId ? { displayName: body.displayName, basicId: body.basicId } : {
        displayName: body.displayName,
      };
    } catch {
      return {};
    }
  },
};

export default channelAccessToken;
