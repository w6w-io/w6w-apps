import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Pushbullet Access Token — `Access-Token: <token>`, a bespoke header, never
 * `Authorization: Bearer`.
 *
 * Confirmed verbatim in the vendor's own docs (`docs.pushbullet.com`, fetched
 * 2026-08-29): "To authenticate for the API, use your access token in a header
 * like `Access-Token: <your_access_token_here>`." The docs also note a second,
 * legacy option — passing the token as the *username* in HTTP Basic Auth, with
 * an empty password — but every documented example on the page uses the
 * header, so that is the only wire format this app produces.
 *
 * ## One token, no scopes
 *
 * Unlike Apify or Ashby, Pushbullet does not offer scoped tokens: a personal
 * access token from Account Settings and an OAuth2 access token both carry
 * full account access, so there is no "narrowest usable token" question and no
 * action here can be legitimately refused by a working credential.
 *
 * ## The probe: `GET /v2/users/me`
 *
 * This is Pushbullet's *only* documented account endpoint, so — unlike Apify,
 * where the equivalent whoami leaks the account's Apify Proxy password — there
 * is no alternative probe to choose between. It was still checked against the
 * pack-wide echo-back rule: the `User` object is `iden`, `email`,
 * `email_normalized`, `name`, `image_url`, `max_upload_size`,
 * `referred_count`, `referrer_iden`, `created`, `modified` — profile fields,
 * never the access token itself. It requires a credential (401 with none, per
 * the vendor's own status-code table) and returns nothing secret, so it is safe
 * as both the liveness probe and the label source.
 */

export interface PushbulletCredential {
  accessToken: string;
}

/** The one place the wire format is built — reused by `sign` and `test`. */
export function authHeaders(credential: Partial<PushbulletCredential>): Record<string, string> {
  return { "access-token": credential.accessToken ?? "" };
}

export const WHOAMI_PATH = "/users/me";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description:
    "Paste an access token from Pushbullet's Account Settings page (pushbullet.com/#settings/account). " +
    "It carries full access to the account, exactly as the official apps use it.",
  connectionLabel: "{{name}} ({{email}})",
  apiKey: { in: "header", name: "Access-Token" },
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "pushbullet.com > Settings > Account > Create Access Token. Keep it private — it " +
        "has full read/write access to the account, including pushes, devices and contacts.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. Pushbullet also accepts the token as an
   * HTTP Basic username, but this app only ever sends the documented header.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PushbulletCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link WHOAMI_PATH} — the one account endpoint Pushbullet publishes. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PushbulletCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${WHOAMI_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    if (res.ok) return { ok: true };

    // Pushbullet's own status-code table: 401 = no valid token provided,
    // 403 = the token is valid but not valid for this particular request.
    // Error bodies carry only a coarse `type` ("invalid_request" / "server"),
    // so the status code — not `type` — is what actually distinguishes these.
    const body = await res.json().catch(() => null) as
      | { error?: { type?: string; message?: string } }
      | null;
    const message = body?.error?.message;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Pushbullet rejected the access token (401)${message ? `: ${message}` : ""}. ` +
          "Reconnect with a token copied from pushbullet.com > Settings > Account.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Pushbullet refused the request with this token (403)${
          message ? `: ${message}` : ""
        }.`,
      };
    }
    return {
      ok: false,
      message: `Pushbullet returned HTTP ${res.status} for ${WHOAMI_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },

  /**
   * Publish name and email for the connection label. Both come straight off
   * the `User` object this app's probe already reads — no extra call, and
   * nothing beyond display fields leaves this hook.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PushbulletCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${WHOAMI_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; email?: string; iden?: string };
      if (!body.name && !body.email) return {};
      return compactDisplay(body);
    } catch {
      return {};
    }
  },
};

function compactDisplay(
  body: { name?: string; email?: string; iden?: string },
): Record<string, string> {
  const out: Record<string, string> = {};
  if (body.name) out.name = body.name;
  if (body.email) out.email = body.email;
  if (body.iden) out.userIden = body.iden;
  return out;
}

export default accessToken;
