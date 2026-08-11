import type { AuthDefinition } from "@w6w/types";
import { normalizeSiteUrl } from "../lib/client.ts";

/**
 * Mattermost personal access token / bot token — `Authorization: Bearer …`.
 *
 * ## The wire format, from the vendor
 *
 * Mattermost's own API documentation gives the curl verbatim:
 *
 *     curl -i -H 'Authorization: Bearer 9xuqwrwgstrb3mzrxb83nb357a' \
 *          http://localhost:8065/api/v4/users/me
 *
 * The same `Bearer` scheme carries three different credentials, and the
 * difference matters:
 *
 *  - a **session token** from `POST /api/v4/users/login` — **expires**;
 *  - a **personal access token** — "will live until they are manually revoked
 *    by the user or an admin", in the vendor's words;
 *  - a **bot access token** — the same thing issued to a bot account.
 *
 * This app takes the second or third and deliberately not the first, for the
 * reason that recurs across this pack: `sign` is network-less, so a credential
 * that has to be fetched before it can be attached cannot be refreshed from
 * there, and a session token would expire underneath a Connection that still
 * looks healthy. A personal access token has no expiry to design around.
 *
 * Personal access tokens must be enabled by a System Console setting
 * (**Integrations → Integration Management → Enable Personal Access Tokens**)
 * and the issuing user needs the `create_post` / channel permissions the actions
 * use. A bot account is usually the better choice for automation, and the field
 * hint says so.
 *
 * ## Why the server URL is a field here and not an action param
 *
 * A token issued by `mattermost.acme.com` is meaningless on
 * `community.mattermost.com`. Mattermost writes every documentation example
 * against `http://localhost:8065` because the host is whatever the operator
 * chose. Putting the URL on the Connection keeps the two halves of the
 * credential together and keeps every action host-agnostic;
 * `tests/index.test.ts` asserts no action can take a URL or host param.
 *
 * It is a plain `string`, not a `secret`: a URL is an address, and masking it
 * would make a typo impossible to spot.
 */

export interface MattermostCredential {
  siteUrl: string;
  token: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<MattermostCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/api/v4/users/me";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Create a token in Mattermost under Profile → Security → Personal Access Tokens (or issue a " +
    "bot token in the System Console), then paste it here with your server URL.",
  connectionLabel: "{{user.username}} @ {{site.host}}",
  fields: [
    {
      key: "siteUrl",
      label: "Mattermost URL",
      type: "string",
      required: true,
      placeholder: "https://mattermost.example.com",
      hint: "The root URL of your Mattermost server — Cloud or self-hosted. No trailing path; a " +
        "trailing `/api/v4` is stripped for you.",
    },
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "A personal access token or a bot token — both use the same header and neither expires. " +
        "Personal access tokens must be enabled in the System Console first. Prefer a bot " +
        "account for automation: it is revocable on its own and does not act as a person.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<MattermostCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /api/v4/users/me` is the probe, and it was chosen by reading its
   * response body rather than by its name.
   *
   * **It does not echo the credential.** This is the concern that sinks
   * `/me`-shaped probes elsewhere — Follow Up Boss's `/me` returns the caller's
   * own API key, Mailjet's `/apikey` returns key and secret. Mattermost's user
   * object carries `id`, `username`, `email`, `nickname`, `first_name`,
   * `last_name`, `position`, `roles`, `locale`, `timezone`, `notify_props` and
   * timestamps. No token, and no password — the field is omitted from API
   * responses entirely. The one field worth naming is `auth_data`, which for an
   * SSO user is their identifier at the identity provider, not a secret of this
   * connection; `afterConnect` deliberately does not republish it.
   *
   * **It needs no permission beyond existing.** Probing a channel or a team
   * instead would report a correctly-scoped bot as broken whenever it simply has
   * not been added to that channel — which is the *desired* configuration.
   *
   * The rejected alternative was `GET /api/v4/system/ping`, which is
   * **unauthenticated**: verified on the wire, it returns `200 {"status":"OK"}`
   * with no `Authorization` header at all. A Connection whose credential never
   * got attached would pass a probe against it. It is genuinely useful, and it
   * is used — as the per-connection `instance` health check, where "is the
   * server reachable?" is exactly the question.
   *
   * Mattermost's errors are structured, so they are distinguished rather than
   * flattened: a bad or revoked token is `401` with the id
   * `api.context.session_expired.app_error`.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MattermostCredential>;
    if (!cred?.siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!cred?.token) return { ok: false, message: "credential missing token" };

    let base: string;
    try {
      base = normalizeSiteUrl(cred.siteUrl);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => null) as { id?: string; message?: string } | null;
      const expired = body?.id?.includes("session_expired") ||
        body?.id?.includes("invalid_session");
      return {
        ok: false,
        message: expired
          ? "Mattermost rejected the token (401). Personal access tokens do not expire, so this " +
            "usually means it was revoked, or that personal access tokens are disabled in the " +
            "System Console."
          : `Mattermost rejected the token (${res.status}${body?.id ? ` ${body.id}` : ""})` +
            `${body?.message ? `: ${body.message}` : ""}`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `No Mattermost at this URL — ${PROBE_PATH} is not routed here.`,
      };
    }
    if (!res.ok) return { ok: false, message: `Mattermost returned HTTP ${res.status}` };

    // A 200 that is not a user record means something else is answering on this
    // origin — a reverse proxy's login page, a captive portal, a parked domain.
    // Mattermost is very commonly behind exactly such a proxy.
    const user = await res.json().catch(() => null) as { id?: string; username?: string } | null;
    if (!user || typeof user.id !== "string" || !user.username) {
      return {
        ok: false,
        message: "Host answered but did not return a Mattermost user — is this URL Mattermost?",
      };
    }
    return { ok: true };
  },

  /**
   * Records the server origin and the acting identity, so the client can build
   * URLs — and a UI can label the Connection — without either seeing the token.
   *
   * `username` and `id` are published; `email` and `auth_data` are not. The
   * email belongs to a person rather than to the integration, and `auth_data` is
   * the user's identifier at an external identity provider. Neither is needed to
   * label a Connection, and a display block is shown wherever the Connection is.
   *
   * The server version is taken from the `X-Version-Id` response header rather
   * than a body field — verified present on `community.mattermost.com` — because
   * knowing whether a connection points at an old server is the first thing that
   * explains a missing endpoint.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MattermostCredential>;
    if (!cred?.siteUrl) return {};

    let siteUrl: string;
    try {
      siteUrl = normalizeSiteUrl(cred.siteUrl);
    } catch {
      return {};
    }

    const display: Record<string, unknown> = {
      siteUrl,
      site: { host: new URL(siteUrl).host },
    };

    const res = await ctx.fetch(`${siteUrl}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const user = await res.json().catch(() => ({})) as {
        id?: string;
        username?: string;
        roles?: string;
      };
      display.user = { id: user.id, username: user.username, roles: user.roles };
      // `X-Version-Id` is a dotted build string whose first component is the
      // server version (e.g. `11.11.0.31364844342.…`).
      const version = res.headers.get("x-version-id");
      if (version) display.server = { version: version.split(".").slice(0, 3).join(".") };
    }
    return display;
  },
};

export default accessToken;
