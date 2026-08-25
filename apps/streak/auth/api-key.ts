import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Streak API Key — HTTP Basic Auth with the key as the username and no
 * password.
 *
 * Confirmed against Streak's own authentication guide (`streak.readme.io/docs/authentication`,
 * fetched 2026-08-25): "Streak uses HTTP Basic Auth to sign each request with
 * your API key. Simply set the username of the request to the API key. We do
 * not require a password." The guide's own sample line is
 * `curl https://api.streak.com/api/v1/pipelines -u YOUR_API_KEY:` — the
 * trailing colon and nothing after it. This app types `basic` rather than
 * `apiKey` because that is literally what the vendor implements, down to the
 * Basic auth challenge on the wire (see below), not a bearer token dressed up
 * as one.
 *
 * ## Two different 401 bodies for two different failures — checked live
 *
 *     $ curl -s https://api.streak.com/api/v1/users/me
 *     {"error":"Authentication required"}
 *
 *     $ curl -s -u badkey123: https://api.streak.com/api/v1/users/me
 *     {"success": false, "error": "invalid api key"}
 *
 * Both are HTTP 401, and the shapes differ (`success` is present only on the
 * second). Both are handled by `message`; the distinction is surfaced rather
 * than collapsed into one generic "unauthorized," since the first case means
 * the Authorization header never reached the request at all and the second
 * means it did and Streak rejected it.
 *
 * ## The probe is `GET /users/me`, and it is safe to be
 *
 * Streak's own guidance warns "Your API key has all of the same privileges
 * that you have while accessing Streak" — a key is never scoped down, so
 * there is no narrower-credential concern the way there is for Apify's
 * scoped tokens. What still had to be checked, the way it always does, is
 * whether the response ECHOES the key back: it does not. The documented body
 * is `email`, `lowercaseEmail`, three timestamps, `isOauthComplete`,
 * `userKey`, `displayName` and `key` (the user's own key, not the API key) —
 * no credential material, unlike Follow Up Boss's `/me` or Mailjet's
 * `/apikey`.
 */

export interface StreakCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

interface StreakUserBody {
  error?: string;
  success?: boolean;
  email?: string;
  displayName?: string;
  userKey?: string;
  key?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Gmail → the Streak icon in the right sidebar → Integrations → Streak API → Create New Key. " +
    "The key carries the same privileges as your own Streak account, so keep it secret.",
  connectionLabel: "Streak ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Gmail → Streak sidebar icon → Integrations → Streak API. Sent as the HTTP Basic " +
        "username; Streak requires no password.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns. No password half exists to omit.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<StreakCredential>;
    request.headers["authorization"] = authHeader(apiKey ?? "");
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<StreakCredential>;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/users/me`, {
      headers: { accept: "application/json", authorization: authHeader(apiKey) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as StreakUserBody | null;

    if (res.status === 401 && body?.success === false) {
      return {
        ok: false,
        message: `Streak rejected the API key: ${
          body.error ?? "invalid api key"
        }. Check it was copied exactly from Integrations → Streak API and has not been deleted.`,
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: "Streak received no credential — the API key did not reach the request.",
      };
    }
    return {
      ok: false,
      message: `Streak returned HTTP ${res.status} for /users/me${
        body?.error ? `: ${body.error}` : ""
      }`,
    };
  },

  /**
   * Publish the account's email as the display label. `GET /users/me` is the
   * same endpoint `test` already proved reachable and carries no credential
   * material, so nothing needs to be dropped here — unlike Apify's whoami,
   * which this app would have had to avoid.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as Partial<StreakCredential>;
    if (!apiKey) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}/users/me`, {
        headers: { accept: "application/json", authorization: authHeader(apiKey) },
      });
      if (!res.ok) return {};
      const body = await res.json() as StreakUserBody;
      return body?.email ? { email: body.email } : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;
