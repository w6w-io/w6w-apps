import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatInstapaperError, isErrorArray } from "../lib/client.ts";
import { buildOAuth1Header, parseFormBody } from "../lib/oauth1.ts";

/**
 * xAuth — the ONLY way to get an Instapaper access token, per the docs' own
 * words. It is a two-step story:
 *
 *  1. **`exchange`** spends the user's username/password exactly once,
 *     against `POST /api/1/oauth/access_token` with `x_auth_mode=client_auth`,
 *     signed with the app's consumer key/secret (no token yet — a "two-legged"
 *     OAuth 1.0a request). The response is NOT JSON: a single qline-like line,
 *     `oauth_token=...&oauth_token_secret=...`, "to match conventions when
 *     issuing access tokens" (the docs' own phrasing) — every other success
 *     response in this API is a JSON array.
 *  2. **`sign`** then signs every subsequent request with the full OAuth 1.0a
 *     three-legged parameter set (consumer key/secret + token/token secret).
 *
 * ## Why `custom`, not `oauth2` or `basic`
 *
 * This is OAuth **1.0a**, a different protocol with different mechanics
 * (`@w6w/types`'s `oauth2` config models RFC 6749 authorization/token URLs and
 * PKCE, neither of which apply here). And the credential the user types
 * (username/password) is not the credential that signs requests (the
 * exchanged token), so `basic` — which resends the typed credential on every
 * request — is also the wrong shape. Same reasoning as `bluesky/app-password.ts`
 * and `agencyzoom/auth/login.ts` in this pack, for a still-different exchange.
 *
 * ## The password is not required, and is not retained
 *
 * The docs are explicit: "Passwords are not required... you cannot assume
 * that an empty password is a user error", and separately: "If an account
 * does not have a password, any value works." The `password` field is
 * therefore optional here. Unlike Bluesky/AgencyZoom, the exchanged
 * credential does NOT keep the password: Instapaper documents no token
 * expiry and no refresh endpoint for the OAuth access token it issues, so
 * there is nothing a stored password would ever be used to redo — keeping it
 * would be a live secret held for no operation this app performs.
 *
 * ## No `refresh`, no `revoke`
 *
 * Neither is documented. The Full API names no "refresh this token" method
 * and no "revoke this token" endpoint — the closest thing to expiry it
 * mentions is that tokens are "currently" up to 50 characters, with nothing
 * about a lifetime. Adding either hook would be inventing an endpoint.
 *
 * ## An app-level consumer key/secret is a prerequisite this app cannot skip
 *
 * "To get an OAuth consumer token for your application, fill this out... All
 * token requests are reviewed by a human before being activated." There is no
 * way to xAuth without one — it is collected as a field here rather than
 * hardcoded, since this app has no consumer credential of its own to ship.
 */
export interface InstapaperCredential {
  consumerKey: string;
  consumerSecret: string;
  oauthToken: string;
  oauthTokenSecret: string;
  username: string;
}

interface VerifiedUser {
  userId?: number;
  username?: string;
}

/**
 * `POST /api/1/account/verify_credentials` — returns only
 * `{"type":"user","user_id","username"}`. No token/secret is ever echoed
 * back, which is what makes this safe as both the connect-time probe and the
 * derived `auth:xauth` health check.
 */
async function verifyCredentials(
  cred: Partial<InstapaperCredential>,
  ctx: { fetch: typeof fetch },
): Promise<VerifiedUser> {
  if (!cred.consumerKey || !cred.consumerSecret || !cred.oauthToken || !cred.oauthTokenSecret) {
    throw new Error("credential is incomplete — reconnect the account");
  }
  const path = "/api/1/account/verify_credentials";
  const url = `${API_BASE}${path}`;
  const header = await buildOAuth1Header("POST", url, {}, {
    consumerKey: cred.consumerKey,
    consumerSecret: cred.consumerSecret,
    token: cred.oauthToken,
    tokenSecret: cred.oauthTokenSecret,
  });

  let res: Response;
  try {
    res = await ctx.fetch(url, { method: "POST", headers: { authorization: header } });
  } catch (err) {
    throw new Error(`could not reach Instapaper: ${String(err)}`);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Instapaper returned a non-JSON response (HTTP ${res.status})`);
  }
  if (isErrorArray(json)) throw new Error(formatInstapaperError(res.status, path, json, text));
  if (!Array.isArray(json) || (json[0] as Record<string, unknown> | undefined)?.type !== "user") {
    throw new Error(`Instapaper returned an unexpected response shape (HTTP ${res.status})`);
  }
  const user = json[0] as { user_id?: number; username?: string };
  return { userId: user.user_id, username: user.username };
}

const xAuth: AuthDefinition = {
  key: "xauth",
  type: "custom",
  displayName: "Instapaper Account (xAuth)",
  description: "Your Instapaper email/username and password, exchanged once via xAuth for an " +
    "OAuth 1.0a access token. Requires a consumer key/secret issued by Instapaper for your " +
    "application (instapaper.com/main/request_oauth_consumer_token) — every request is reviewed " +
    "by a human before activation.",
  connectionLabel: "{{username}}",
  fields: [
    {
      key: "consumerKey",
      label: "Consumer Key",
      type: "secret",
      required: true,
      hint: "Issued by Instapaper after filling out " +
        "https://www.instapaper.com/main/request_oauth_consumer_token.",
    },
    {
      key: "consumerSecret",
      label: "Consumer Secret",
      type: "secret",
      required: true,
    },
    {
      key: "username",
      label: "Email or username",
      type: "string",
      required: true,
      row: "login",
    },
    {
      key: "password",
      label: "Password, if you have one",
      type: "secret",
      required: false,
      row: "login",
      hint: "Instapaper accounts are not required to have a password. Leave this blank for an " +
        "account with none — Instapaper accepts any value in that case.",
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const consumerKey = String(f.consumerKey ?? "").trim();
    const consumerSecret = String(f.consumerSecret ?? "").trim();
    const username = String(f.username ?? "").trim();
    const password = f.password === undefined || f.password === null ? "" : String(f.password);
    if (!consumerKey) throw new Error("`consumerKey` is required");
    if (!consumerSecret) throw new Error("`consumerSecret` is required");
    if (!username) throw new Error("`username` is required");

    const path = "/api/1/oauth/access_token";
    const url = `${API_BASE}${path}`;
    const bodyParams: Record<string, string> = {
      x_auth_username: username,
      x_auth_password: password,
      x_auth_mode: "client_auth",
    };
    const header = await buildOAuth1Header("POST", url, bodyParams, {
      consumerKey,
      consumerSecret,
    });

    let res: Response;
    try {
      res = await ctx.fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", authorization: header },
        body: new URLSearchParams(bodyParams).toString(),
      });
    } catch (err) {
      throw new Error(`could not reach Instapaper: ${String(err)}`);
    }
    const text = await res.text();
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (isErrorArray(json)) message = formatInstapaperError(res.status, path, json, text);
      } catch {
        // Not JSON — keep the generic HTTP-status message.
      }
      throw new Error(`Instapaper sign-in failed: ${message}`);
    }

    // Success is a single qline-like line, e.g.
    // `oauth_token=aabbccdd&oauth_token_secret=efgh1234` — NOT JSON, unlike
    // every other successful response in this API.
    const parsed = new URLSearchParams(text.trim());
    const oauthToken = parsed.get("oauth_token");
    const oauthTokenSecret = parsed.get("oauth_token_secret");
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error("Instapaper did not return an oauth_token/oauth_token_secret pair");
    }

    return {
      consumerKey,
      consumerSecret,
      oauthToken,
      oauthTokenSecret,
      username,
    } satisfies InstapaperCredential;
  },

  async sign({ request, credential }) {
    const cred = credential as InstapaperCredential;
    const bodyParams = parseFormBody(request.body);
    const header = await buildOAuth1Header(request.method, request.url, bodyParams, {
      consumerKey: cred.consumerKey,
      consumerSecret: cred.consumerSecret,
      token: cred.oauthToken,
      tokenSecret: cred.oauthTokenSecret,
    });
    request.headers["authorization"] = header;
    return request;
  },

  async test({ credential }, ctx) {
    try {
      const user = await verifyCredentials(credential as Partial<InstapaperCredential>, ctx);
      return { ok: true, message: `authenticated as ${user.username ?? "an Instapaper user"}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  /**
   * Instapaper's own guidance: "Account usernames may change... check the
   * username value to see if it has changed and record the change in your
   * application as necessary." This reconciles the connection label against
   * the canonical value rather than trusting what the user originally typed.
   */
  async afterConnect({ credential }, ctx) {
    try {
      const user = await verifyCredentials(credential as Partial<InstapaperCredential>, ctx);
      return { username: user.username, userId: user.userId };
    } catch {
      return {};
    }
  },
};

export default xAuth;
