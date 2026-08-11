import type { AuthDefinition } from "@w6w/types";
import { ACCEPT, API_BASE, formatVimeoError, USER_AGENT } from "../lib/client.ts";

/**
 * Vimeo access token — `Authorization: Bearer {access_token}`.
 *
 * Verified against `developer.vimeo.com/api/authentication` and
 * `/api/common-formats#using-the-authorization-header` (read 2026-08-11), plus
 * live probes against `api.vimeo.com` the same day.
 *
 * ## Why a pasted token rather than an OAuth2 flow
 *
 * Vimeo supports four OAuth 2.0 grants (client credentials, authorization
 * code, implicit, device code) and a *personal access token* generated on the
 * developer site. All five produce the same artefact: an opaque bearer string
 * presented as `Authorization: bearer {token}`. This app takes the token
 * directly, which covers the personal-access-token case and the
 * already-exchanged case without this app needing a registered client id and
 * secret. The authorization-code flow is deliberately **not** modelled here —
 * it needs a Vimeo app registration whose redirect URI is per-installation, and
 * inventing one would be worse than leaving it out. That is stated in the
 * README rather than half-built.
 *
 * ## Scopes, and why the probe below is the narrowest one there is
 *
 * A token carries scopes chosen at creation: `public`, `private`, `purchased`,
 * `create`, `edit`, `delete`, `interact`, `upload`, `promo_codes`, `stats`,
 * `video_files`. Vimeo denies a request whose token lacks the scope the
 * endpoint needs. The authentication guide states the rule that decides the
 * probe outright:
 *
 *   "An authenticated access token with the `public` scope is identical to an
 *    unauthenticated access token, except that you can use the `/me` endpoint
 *    to refer to the currently logged-in user. Accessing `/me` with an
 *    unauthenticated access token generates an error."
 *
 * So `GET /me` is the one call that (a) needs no scope beyond the minimum every
 * token has, and (b) **cannot** succeed without a real user-bound credential.
 * Both halves matter. A probe against, say, `GET /me/videos` would report a
 * perfectly good `public`-scope token as broken; a probe against a public
 * endpoint like `GET /videos?query=x` would pass for a connection whose token
 * never got attached at all.
 *
 * ## The probe is `GET /me?fields=uri,name`, and the `fields` is not decoration
 *
 * The full `/me` representation is 229 documented fields and two of them are
 * cleartext secrets:
 *
 *   - `preferences.videos.password` — "The password for viewing the
 *     authenticated user's videos."
 *   - `preferences.videos.privacy.password` — "The default password for the
 *     video."
 *
 * Neither is *this* connection's credential, so `/me` is not a Mailjet
 * `/apikey`-style self-echo — it does not return the access token. But a
 * credential probe's response is exactly the thing that ends up in a health
 * report, a connection label and a debug log, and putting a user's video
 * password there is not acceptable. `fields=uri,name` is the vendor's own
 * documented filter (`/api/common-formats#json-filter`, supported on every
 * method except DELETE, always as a query parameter) and it means the response
 * *provably* contains nothing else. It also doubles the request quota, which is
 * free.
 *
 * `afterConnect` uses the same filtered call for the same reason.
 */

export interface VimeoCredential {
  accessToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<VimeoCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/** Headers every probe sends alongside the credential, matching `VimeoClient`. */
export function probeHeaders(credential: Partial<VimeoCredential>): Record<string, string> {
  return { accept: ACCEPT, "user-agent": USER_AGENT, ...authHeaders(credential) };
}

/** What `/me?fields=uri,name` returns, and the only shape this module reads. */
interface MeResponse {
  uri?: string;
  name?: string;
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description: "Paste a Vimeo access token. The simplest source is a personal access token from " +
    "developer.vimeo.com > your app > Authentication; a token obtained through any OAuth 2.0 " +
    "grant works identically. Grant it only the scopes this connection needs — Vimeo denies " +
    "anything outside them.",
  connectionLabel: "Vimeo ({{name}})",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Scopes decide what this connection can do: `private` to read your own videos, `edit` " +
        "to change them, `delete` to remove them, `upload` to create them, `interact` to like " +
        "or comment. A token with only `public` can still connect — it just cannot do much.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns the request.
   *
   * The header name is lowercase `authorization` and the scheme is capitalised
   * `Bearer`. Vimeo's guide writes it lowercase (`Authorization: bearer
   * {access_token}`) and its error documentation says a 401 with code 8003 is
   * what you get "if you leave out the `bearer` keyword" — the scheme token is
   * case-insensitive per RFC 7235, and `Bearer` is the spelling every one of
   * the vendor's cURL examples uses.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<VimeoCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Validate the credential against `GET /me?fields=uri,name`.
   *
   * The status codes are separated because Vimeo's are specific enough to act
   * on and they are three different problems:
   *
   *   - **401, error code 8003** — no credential arrived, or the `bearer`
   *     keyword was missing, or the token string is not recognised. Confirmed
   *     live: an unauthenticated `GET https://api.vimeo.com/` answers `401`,
   *     `content-type: application/vnd.vimeo.error+json`,
   *     `www-authenticate: Bearer error="invalid_token"`, with
   *     `error_code: 8003` and the developer message "The app didn't receive
   *     the user's credentials."
   *   - **401, error code 8002** — the token is valid but is not bound to a
   *     user, i.e. an *unauthenticated* token from the client-credentials
   *     grant. That token cannot reach `/me` by design and cannot be fixed by
   *     re-pasting; it has to be replaced with a user-bound one.
   *   - **403** — the token is real but its scopes do not permit the call.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<VimeoCredential> | undefined;
    if (!cred?.accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/me?fields=uri,name`, {
      headers: probeHeaders(cred),
    });

    if (res.ok) {
      const me = await res.json().catch(() => null) as MeResponse | null;
      // A 200 whose body is not a user representation means the request landed
      // somewhere unexpected, so it is not treated as a pass.
      if (!me?.uri) {
        return { ok: false, message: "Vimeo answered 200 but returned no user URI" };
      }
      return { ok: true };
    }

    const raw = await res.text().catch(() => "");
    let code: number | undefined;
    try {
      code = (JSON.parse(raw) as { error_code?: number }).error_code;
    } catch { /* fall through to the generic message */ }

    if (code === 8002) {
      return {
        ok: false,
        message: "This token is valid but is not bound to a Vimeo user, so it cannot read /me " +
          "(Vimeo error 8002). Client-credentials tokens are 'unauthenticated' tokens and only " +
          "reach public data. Use a personal access token, or a token from the authorization " +
          "code or device code grant.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: "Vimeo rejected the token (401" + (code ? ` error_code ${code}` : "") +
          "). Check it was copied exactly and has not been revoked. Vimeo also deletes tokens " +
          "it considers inactive.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "Vimeo accepted the token but refused the request (403). The token's scopes do " +
          "not cover reading the authenticated user.",
      };
    }
    return { ok: false, message: formatVimeoError(res.status, "GET", "/me", raw) };
  },

  /**
   * Publish the account's display name and URI so a list of Connections is
   * readable without opening each one.
   *
   * Same filtered call as `test`, for the same reason: whatever this returns is
   * stored on the redacted Connection and rendered in a UI, so it must not be
   * able to contain a password. `uri` and `name` are both scalars, so the
   * documented "you also get everything nested below a field you asked for"
   * rule cannot widen them.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<VimeoCredential> | undefined;
    if (!cred?.accessToken) return {};
    const res = await ctx.fetch(`${API_BASE}/me?fields=uri,name`, {
      headers: probeHeaders(cred),
    });
    if (!res.ok) return {};
    const me = await res.json().catch(() => null) as MeResponse | null;
    if (!me) return {};
    return { name: me.name, uri: me.uri };
  },
};

export default accessToken;
