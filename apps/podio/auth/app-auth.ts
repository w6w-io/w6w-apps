import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, classifyAuthFailure, readErrorBody, truncate } from "../lib/client.ts";

/**
 * Podio **App Authentication** — `grant_type: "app"`.
 *
 * Verified on 2026-08-11 against `developers.podio.com/authentication/app_auth`,
 * against Podio's own PHP client (`podio/podio-php`, `lib/PodioClient.php`
 * v7.0.0, `authenticate_with_app` / `authenticate`), and against live probes of
 * `api.podio.com`.
 *
 * ## Why this is the primary method
 *
 * Podio documents four flows. This is the only one that is both
 * (a) fully self-service — every value is minted by the user in the Podio UI,
 * with nothing to register on the w6w host — and (b) usable in a scheduled or
 * background run, because it involves no browser redirect. The vendor agrees:
 * "App Authentication flow, being more secure, is the preferred way of
 * authentication over Username and Password flow", and "Good uses for the app
 * authentication flow are automated scripts that run without any user
 * interaction."
 *
 * Its limit is the point of it: a token minted this way "can only access that
 * specific app", and content it creates "will appear as having been created by
 * the app itself rather than a specific user". Podio's reference marks the
 * operations reachable this way with a badge; see `index.ts` for the list this
 * app implements, which is derived from that badge rather than guessed.
 *
 * ## `type: "custom"`, not `"oauth2"`
 *
 * The `oauth2` type in this spec models the browser authorization-code flow
 * (`authorizationUrl` + redirect). This is a machine-to-machine grant with no
 * redirect at all, so it keeps working unattended. Same shape as the sibling
 * `kajabi` and `paypal` apps' client-credentials methods, which this follows
 * deliberately.
 *
 * ## The token endpoint is the trap in this API
 *
 * Podio publishes **two** token endpoints that are exact mirror images of each
 * other, and each rejects the other's encoding. Measured on 2026-08-11, all
 * four combinations, same bogus body:
 *
 *   | Endpoint            | Body               | Status | `error`         | `error_description`            |
 *   | ------------------- | ------------------ | ------ | --------------- | ------------------------------ |
 *   | `/oauth/token/v2`   | `application/json` | 400    | `invalid_client`| "you've supplied an invalid client id" |
 *   | `/oauth/token/v2`   | form-encoded       | 400    | `invalid_value` | "Invalid value null (null): must be object" |
 *   | `/oauth/token`      | form-encoded       | 400    | `invalid_client`| "you've supplied an invalid client id" |
 *   | `/oauth/token`      | `application/json` | 400    | `invalid_client`| "Missing parameter client_id"  |
 *
 * Rows 1 and 3 parsed the body and got as far as validating the client id. Rows
 * 2 and 4 never parsed it — and neither says so. "must be object" and "Missing
 * parameter client_id" both read like *your credentials are wrong*, which is
 * how this costs an afternoon.
 *
 * The written documentation only ever shows `/oauth/token/v2` with a JSON body.
 * The vendor's own PHP client only ever posts form-encoded to `/oauth/token`.
 * This app follows the client, for one reason: form-encoded is what
 * RFC 6749 §4.1.3 specifies for a token request, so it is also what the
 * `oauth2` method in `auth/oauth2.ts` — whose token call the *host* makes,
 * generically — has to be able to use. Two auth methods pointing at two
 * different token endpoints would be one more thing to get wrong.
 */

/** Form-encoded, per the vendor's own client. See the header comment. */
export const TOKEN_URL = `${API_BASE}/oauth/token`;

/**
 * The credential-liveness probe, for both auth methods in this app.
 *
 * `GET /oauth/scope` was chosen by reading what it returns, and by measuring
 * the wire on 2026-08-11:
 *
 * **(a) It requires a credential.** Unauthenticated it answers `401
 * unauthorized / invalid_request`; with a syntactically plausible but bogus
 * token, `401 unauthorized / expired_token`. Both observed live. That rules out
 * any unauthenticated endpoint, where a Connection whose token never got
 * attached would sail through.
 *
 * **(b) It works for an app token *and* a user token.** This is the constraint
 * that eliminates every obvious alternative. `GET /user`, `GET /user/status`
 * and `GET /org/` all describe the authenticated *user* — and an app-auth token
 * has no user, so probing there would report a perfectly good app Connection as
 * broken. `/oauth/scope` describes the client's own grant, which exists in both
 * cases, and Podio's reference carries the "Can be used with App
 * Authentication" badge on it.
 *
 * **(c) It is not scope-restricted.** It *reports* the scope, so no narrowing
 * of the grant can withhold it. A scoped Podio token may legitimately be
 * refused `/org/` or a given app; being refused this would be a contradiction.
 *
 * **(d) It returns no credential material.** Its documented response is a list
 * of `{ref_type, ref_id, permissions, ref_data}` — what the client may touch
 * and with what rights. Contrast `GET /user/status`, which returns
 * `calendar_code` (the token in the account's iCal feed URL) and the account's
 * mailbox prefix, and `GET /app/{app_id}`, which returns the app token itself.
 */
export const PROBE_PATH = "/oauth/scope";

/**
 * Why the whoami is not the probe — an exported constant so the reason survives
 * the next person who notices `/user/status` is the obvious choice.
 *
 * Two independent disqualifications, either one sufficient. It is unreachable
 * under App Authentication, which is this app's primary method. And its
 * documented response carries `calendar_code`, "The code to use when getting
 * iCal feeds" — a bearer secret embedded in a URL, which a health probe would
 * copy into the health surface on every run, forever. Follow Up Boss's `/me`,
 * Mailjet's `/apikey` and Apify's `/users/me` are the same trap, and all three
 * are already banned pack-wide.
 */
export const WHY_NOT_USER_STATUS =
  "GET /user/status is unreachable under App Authentication and returns calendar_code, " +
  "the secret in the account's iCal feed URL";

/** What this app persists on an App Authentication Connection. */
export interface PodioAppCredential {
  clientId: string;
  clientSecret: string;
  appId: string;
  appToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

/** Podio's token response, per the vendor's documented example. */
interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  ref?: { type?: string; id?: number | string };
  error?: string;
  error_description?: string;
}

/**
 * The wire format for `Authorization`, built in exactly one place.
 *
 * **`OAuth2`, not `Bearer`.** Podio's authentication page is explicit —
 * "Authorization: OAuth2 ACCESS_TOKEN" — and the vendor's own PHP client sends
 * `"OAuth2 {$token}"`. This is worth stating because everything around it says
 * *bearer*: the token response's own `token_type` is `"bearer"`, and a 401 from
 * `api.podio.com` comes back with `WWW-Authenticate: Bearer realm="podio"`
 * (measured). Both schemes are in fact accepted today — `OAuth2 bogus` and
 * `Bearer bogus` produced byte-identical 401 bodies on 2026-08-11 — but the
 * documented one is the one with a compatibility promise, so it is the one used
 * here.
 *
 * Exported so `test` and `afterConnect` exercise the same code path `sign`
 * does; a hand-rolled second copy is how a probe ends up sending a header the
 * real requests do not.
 */
export function authHeaders(accessToken: string | undefined): Record<string, string> {
  return { authorization: `OAuth2 ${accessToken ?? ""}` };
}

/**
 * `POST /oauth/token`, form-encoded.
 *
 * The credentials go in the **body**, not in a Basic header: that is what the
 * vendor's client does and what the documented request shows. Failures are
 * surfaced from Podio's flat OAuth envelope; neither the request body nor any
 * credential is ever included in the thrown message.
 */
async function requestToken(
  ctx: HookContext,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || !body.access_token) {
    const detail = [body.error, body.error_description].filter(Boolean).join(": ");
    throw new Error(
      `Podio token request failed (${res.status})${detail ? `: ${truncate(detail, 300)}` : ""}`,
    );
  }
  return body;
}

/**
 * Fold a token response into the stored credential.
 *
 * `expiresAt` is recorded so the host can refresh *before* Podio starts
 * answering 401, which matters here more than usual: Podio's 401 for a dead
 * token says `expired_token` whether or not it ever was valid, so a client that
 * waits for the error cannot tell "refresh me" from "reconnect me". The vendor
 * documents an 8-hour access token and a 28-day refresh token; the value is
 * still taken from `expires_in` rather than assumed, and the 60-second haircut
 * absorbs clock skew.
 *
 * `refresh_token` is preserved from the previous credential when a response
 * omits it, so a refresh that returns only an access token does not silently
 * strip the Connection's ability to refresh again.
 */
function foldToken(
  base: Omit<PodioAppCredential, "accessToken" | "expiresAt">,
  body: TokenResponse,
): Record<string, unknown> {
  return {
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    appId: base.appId,
    appToken: base.appToken,
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? base.refreshToken,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 28800) - 60) * 1000).toISOString(),
  };
}

/** One entry of `GET /oauth/scope`. */
interface ScopeEntry {
  ref_type?: string | null;
  ref_id?: number | string | null;
  permissions?: string[];
  ref_data?: { name?: string; config?: { name?: string } };
}

/**
 * A one-line label for a scope grant, built defensively.
 *
 * `ref_data` is documented as "... more space data here" — an open-ended blob
 * whose contents depend on `ref_type` — so nothing is assumed beyond a possible
 * `name`. A grant with no readable name falls back to its type and id, and a
 * global grant (`ref_type: null`, `permissions: ["all"]`) to the word "global",
 * which is the vendor's own term for it.
 */
export function describeScope(entries: ScopeEntry[] | null | undefined): string {
  if (!Array.isArray(entries) || entries.length === 0) return "no scope reported";
  const parts = entries.slice(0, 3).map((e) => {
    const name = e.ref_data?.name ?? e.ref_data?.config?.name;
    const subject = e.ref_type ? `${e.ref_type} ${e.ref_id ?? "?"}` : "global";
    const permissions = (e.permissions ?? []).join("/");
    return `${name ?? subject}${permissions ? ` (${permissions})` : ""}`;
  });
  if (entries.length > 3) parts.push(`+${entries.length - 3} more`);
  return parts.join(", ");
}

/**
 * Run the shared probe and turn the answer into `{ ok, message }`.
 *
 * Shared by both auth methods so there is exactly one place that decides what a
 * Podio auth failure means. It classifies from the response **body**
 * (`classifyAuthFailure`), never the status code: Podio answers 401 both for a
 * credential that never arrived and for one it rejected, and only
 * `error_description` separates them.
 */
export async function probeCredential(
  ctx: HookContext,
  accessToken: string | undefined,
  methodHint: string,
): Promise<{ ok: boolean; message?: string }> {
  const token = (accessToken ?? "").trim();
  if (!token) return { ok: false, message: "credential has no access token — reconnect" };

  const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
    headers: { accept: "application/json", ...authHeaders(token) },
  });
  if (res.ok) return { ok: true };

  const body = await readErrorBody(res);
  const kind = classifyAuthFailure(res.status, body);
  const code = [body?.error, body?.error_description].filter(Boolean).join(" / ");

  if (kind === "missing") {
    return {
      ok: false,
      message: "Podio received no credential (401 unauthorized / invalid_request). The token " +
        "did not reach the request — reconnect this connection.",
    };
  }
  if (kind === "rejected") {
    return {
      ok: false,
      message: `Podio rejected the token (${res.status}${code ? ` ${code}` : ""}). Podio ` +
        "reports `expired_token` for a revoked or never-valid token as well as an expired " +
        `one, so this needs a reconnect rather than a refresh. ${methodHint}`,
    };
  }
  if (kind === "forbidden") {
    return {
      ok: false,
      message: `Podio refused the scope read (403${code ? ` ${code}` : ""}) — the credential ` +
        "authenticated but is not permitted this call.",
    };
  }
  return { ok: false, message: `Podio returned HTTP ${res.status} for ${PROBE_PATH}` };
}

const appAuth: AuthDefinition = {
  key: "app-auth",
  type: "custom",
  displayName: "App Authentication",
  description: "Connects to a single Podio app with no browser sign-in, so it keeps working in " +
    "scheduled runs. Get the Client ID and Client Secret from podio.com/settings/api, and " +
    "the App ID and App Token from the app's own Developer page in Podio (app menu → " +
    "Developer). Content created through this connection is attributed to the app, not to " +
    "a person, and the connection can reach only that one app.",
  connectionLabel: "Podio app {{app.id}} ({{scope.summary}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "podio.com/settings/api — the API key you registered. Any Podio user can create " +
        "one; the domain you register only constrains the browser flow, not this one.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown beside the Client ID at podio.com/settings/api.",
    },
    {
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      row: "app",
      hint: "The numeric id of the Podio app this connection may touch. Open the app in " +
        "Podio → app menu → Developer.",
    },
    {
      key: "appToken",
      label: "App Token",
      type: "secret",
      required: true,
      row: "app",
      hint: "On the same Developer page as the App ID. This is a credential: anyone holding " +
        "it plus a client id and secret can read and write the whole app.",
    },
  ],

  /**
   * Turns the four pasted values into a live token pair at connect time.
   *
   * The body carries `grant_type`, `app_id`, `app_token`, `client_id` and
   * `client_secret` and nothing else. The vendor's *written* example also lists
   * `redirect_uri`, but the vendor's own PHP client omits it for this grant
   * (`PodioClient::authenticate`, `case 'app'`), and a redirect URI is
   * meaningless for a flow with no redirect. The client is the primary source
   * here because it is executable and the prose is not.
   */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    const appId = String(f.appId ?? "").trim();
    const appToken = String(f.appToken ?? "").trim();
    if (!clientId || !clientSecret || !appId || !appToken) {
      throw new Error("Client ID, Client Secret, App ID and App Token are all required.");
    }

    const body = await requestToken(ctx, {
      grant_type: "app",
      app_id: appId,
      app_token: appToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken({ clientId, clientSecret, appId, appToken }, body);
  },

  /**
   * Renew an expired access token.
   *
   * The refresh-token grant is tried first — it is what Podio documents it for
   * and it is the narrower call. But the refresh token has its own 28-day
   * lifetime, and it dies whenever the app token is regenerated in Podio, so a
   * failure falls back to a fresh `app` grant rather than surfacing as a dead
   * Connection: all four originating values are still stored and are still the
   * authority. If both fail the error propagates, because at that point the
   * app token really has been regenerated or the API key revoked, and an
   * operator has to act.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<PodioAppCredential>;
    const clientId = cred.clientId ?? "";
    const clientSecret = cred.clientSecret ?? "";
    const appId = cred.appId ?? "";
    const appToken = cred.appToken ?? "";
    if (!clientId || !clientSecret || !appId || !appToken) {
      throw new Error("credential is missing its originating app values — reconnect");
    }
    const base = { clientId, clientSecret, appId, appToken };

    if (cred.refreshToken) {
      try {
        const body = await requestToken(ctx, {
          grant_type: "refresh_token",
          refresh_token: cred.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        });
        return foldToken({ ...base, refreshToken: cred.refreshToken }, body);
      } catch {
        // Refresh token expired, or the app token was regenerated in Podio.
        // Fall through and re-mint from the values we still hold.
      }
    }

    const body = await requestToken(ctx, {
      grant_type: "app",
      app_id: appId,
      app_token: appToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken(base, body);
  },

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. See {@link authHeaders} for why the scheme
   * is `OAuth2` and not `Bearer`.
   *
   * Podio also accepts the token as an `oauth_token` query parameter (measured:
   * `?oauth_token=…` produces the same 401 body as the header). That form is
   * unreachable from this app by construction — a workflow host logs request
   * URLs and does not log request headers, so a credential in a URL is a
   * credential in a log.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PodioAppCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred.accessToken))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/oauth/scope` and not a whoami. */
  test({ credential }, ctx) {
    const cred = credential as Partial<PodioAppCredential>;
    return probeCredential(
      ctx,
      cred?.accessToken,
      "Check the App Token on the app's Developer page — regenerating it invalidates every " +
        "token granted with it.",
    );
  },

  /**
   * Label the Connection with the app it is locked to and what it may do.
   *
   * The app id comes from the stored credential rather than from a call, and
   * the permissions from the probe endpoint `test` already uses — so this adds
   * no new endpoint and no new failure mode. It deliberately does **not** call
   * `GET /app/{app_id}` to fetch a prettier name: that response carries the app
   * token, and a display label is not worth putting a credential on the wire
   * for.
   *
   * A failure is silent: `test` has already established the token is live, and
   * a missing label must never fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PodioAppCredential>;
    const label = { app: { id: cred.appId ?? "?" }, scope: { summary: "scope unknown" } };
    if (!cred.accessToken) return label;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred.accessToken) },
      });
      if (!res.ok) return label;
      const entries = await res.json().catch(() => null) as ScopeEntry[] | null;
      return { app: { id: cred.appId ?? "?" }, scope: { summary: describeScope(entries) } };
    } catch {
      return label;
    }
  },
};

export default appAuth;
