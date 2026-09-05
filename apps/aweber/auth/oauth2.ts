import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * OAuth 2.0 — the only credential this app implements.
 *
 * Verified live on 2026-09-05: an unsigned request to `GET /1.0/accounts`
 * answers `400 MissingOAuthParametersError` naming OAuth **1.0a** fields
 * (`oauth_consumer_key`, `oauth_nonce`, `oauth_signature`, …), which reads
 * like this API still expects OAuth 1. It does not. That response is the
 * API's fallback for a request carrying no recognizable auth scheme at all;
 * the moment a `Authorization: Bearer <garbage>` header is present, the
 * response changes to the OAuth 2.0 shape (`401 invalid_token`), and the
 * spec's own security scheme is unambiguous: `type: "oauth2"`,
 * `authorizationCode` flow only. AWeber's docs confirm this in prose too:
 * "OAuth 2.0 is the successor to OAuth 1, which AWeber's API formerly used
 * ... Please plan to move to OAuth 2.0 as soon as you are able." OAuth 1.0a
 * is not implemented here.
 *
 * ## Confidential vs public clients
 *
 * AWeber supports both a confidential client (`client_id` + `client_secret`,
 * sent as an `Authorization: Basic` header on the token exchange) and a
 * public client using PKCE instead of a client secret. `pkce` is left at the
 * type default (`true`) since it works for both — a confidential client can
 * layer PKCE on top of its secret with no downside, and it is required for a
 * public one. The `client_id` / `client_secret` / redirect URI themselves are
 * host-side configuration (an app registered at `labs.aweber.com/apps`), not
 * anything this package holds.
 *
 * ## Scopes are enforced per-endpoint, narrowly
 *
 * AWeber's scopes gate individual endpoints rather than whole resources —
 * `subscriber.read` covers reading subscribers and their activity, while
 * `subscriber.write` is required even to *move* or *delete* one. The default
 * scope list below covers every action this app declares; a Connection
 * authorized with a narrower set will see the specific actions needing the
 * missing scope fail with AWeber's own `ForbiddenError`, not this probe.
 */

export interface AweberCredential {
  accessToken: string;
}

/** The one place the wire format is built, shared with `test`. */
export function authHeaders(credential: Partial<AweberCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/**
 * `GET /1.0/accounts` — AWeber's own onboarding example ends here: "the last
 * call in the example is to retrieve the /accounts resource in order to
 * retrieve the account id. The account id and access token are needed for
 * every api call." It needs only the `account.read` scope (the narrowest
 * scope in the whole API), returns no credential material, and is not
 * resource-scoped to any one list or subscriber, so a Connection authorized
 * with the minimum useful scope set still passes.
 */
export const PROBE_PATH = "/accounts";

interface ErrorBody {
  error?: { type?: string; message?: string } | string;
  error_description?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with AWeber)",
  description: "Connect an AWeber customer account. Requires an app registered at " +
    "labs.aweber.com/apps on this w6w installation.",
  connectionLabel: "AWeber ({{account.id}})",
  oauth2: {
    authorizationUrl: "https://auth.aweber.com/oauth2/authorize",
    tokenUrl: "https://auth.aweber.com/oauth2/token",
    refreshUrl: "https://auth.aweber.com/oauth2/token",
    revokeUrl: "https://auth.aweber.com/oauth2/revoke",
    scopes: [
      "account.read",
      "list.read",
      "list.write",
      "subscriber.read",
      "subscriber.write",
      "email.read",
      "email.write",
    ],
    scopeSeparator: " ",
    pkce: true,
  },

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<AweberCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/accounts` and not some other read. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AweberCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as ErrorBody | null;

    // RFC 6750 shape: a bare string `error`, used for bearer-token problems.
    if (typeof body?.error === "string") {
      if (body.error === "invalid_token") {
        return {
          ok: false,
          message: `AWeber rejected the access token (invalid_token${
            body.error_description ? `: ${body.error_description}` : ""
          }). It may be expired or revoked — reconnect this connection.`,
        };
      }
      return {
        ok: false,
        message: `AWeber returned an OAuth error (${body.error}${
          body.error_description ? `: ${body.error_description}` : ""
        })`,
      };
    }

    // REST-layer shape: `error` is an object with a machine `type`.
    const type = typeof body?.error === "object" ? body.error?.type : undefined;
    const message = typeof body?.error === "object" ? body.error?.message : undefined;
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `AWeber refused the accounts read (403${type ? ` ${type}` : ""}${
            message ? `: ${message}` : ""
          }). This can mean a missing account.read scope, a suspended account, or a rate limit — ` +
          "check the AWeber developer console.",
      };
    }
    return {
      ok: false,
      message: `AWeber returned HTTP ${res.status} for ${PROBE_PATH}${type ? ` (${type})` : ""}${
        message ? `: ${message}` : ""
      }`,
    };
  },

  /**
   * Publish the first account's id, since every subsequent call needs it and
   * a Connection list that all reads "AWeber" is unusable.
   *
   * Silent on failure: `test` already established the token works, and a
   * missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<AweberCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { entries?: Array<{ id?: number }> };
      const id = body?.entries?.[0]?.id;
      return id === undefined ? {} : { account: { id } };
    } catch {
      return {};
    }
  },
};

export default oauth2;
