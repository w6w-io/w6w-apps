import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatLokaliseError } from "../lib/client.ts";

/**
 * Lokalise API token — `X-Api-Token: <token>`.
 *
 * Verified against Lokalise's own authentication docs
 * (`developers.lokalise.com/reference/api-authentication`, fetched 2026-09-01)
 * and live probes against `api.lokalise.com` the same day.
 *
 * ## Header, never a query parameter
 *
 * Lokalise documents exactly one presentation: the `X-Api-Token` header. There
 * is no query-string alternative to accidentally reach for.
 *
 * ## Two token kinds, one wire format
 *
 * A user generates either a **read-only** or a **read/write** token from
 * Profile settings > API tokens; a read-only token simply gets `403 Forbidden`
 * from any write call. Both are stamped the same way, so `sign` needs no
 * branching — the failure surfaces per-call, from Lokalise's own error body,
 * not from anything this app can determine in advance.
 *
 * ## `403` also means "not an admin on this project"
 *
 * Lokalise's own admonition: "you must have an admin role in a project in
 * order to access that project with the supplied API token" — a token that is
 * perfectly valid account-wide can still be refused per-project. `test` below
 * therefore probes the account-wide List Projects endpoint rather than a
 * specific project, so a token that is merely scoped away from *some*
 * projects is not reported as dead.
 *
 * ## OAuth2 exists but is not implemented here
 *
 * Lokalise also documents an OAuth2 flow, but registering an OAuth2 app
 * requires contacting Lokalise support directly (via their chat widget) to get
 * a client id/secret issued — there is no self-service application registry.
 * That is a manual, per-integration step this app cannot automate, so only the
 * plain API token is implemented. See the README.
 */

export interface LokaliseCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does.
 */
export function authHeaders(credential: Partial<LokaliseCredential>): Record<string, string> {
  return { "x-api-token": credential.apiToken ?? "" };
}

/**
 * The credential-liveness probe: `GET /projects?limit=1`.
 *
 * Chosen over the tempting `GET /users/{user_id}` "whoami" because that
 * endpoint's own description says it is "Not available via OAuth token" and,
 * more importantly, *requires a `user_id` you do not have* until you have
 * already made some other authenticated call — there is no `/users/me`. List
 * Projects requires a credential, needs no project-specific admin role (see
 * above), and returns nothing but the caller's own project metadata — no
 * token, no password field, nothing that risks becoming a credential leak the
 * way Follow Up Boss's `/me` or Mailjet's `/apikey` are.
 *
 * `limit=1` keeps the probe cheap; an account with zero projects still
 * receives a valid `200` with an empty `projects` array, which is correctly
 * `ok`.
 */
export const PROBE_PATH = "/projects";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste an API token from Lokalise > your team avatar > Profile settings > API tokens. " +
    "Read-only tokens work for every read action here; write actions need a read/write token.",
  connectionLabel: "Lokalise ({{teamName}})",
  apiKey: { in: "header", name: "X-Api-Token" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Profile settings > API tokens > Generate new token.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<LokaliseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See {@link PROBE_PATH}.
   *
   * ## A documented-vs-observed gap: 400 is also "bad credential"
   *
   * Lokalise's error-codes page documents `401 Unauthorized` as "No valid API
   * key provided." Live probes on 2026-09-01 show that is only half true:
   *
   *  - **No header at all, or a header that fails Lokalise's own format
   *    check** (wrong length/charset) answers **`400`** with
   *    `{"error":{"message":"Invalid \`X-Api-Token\` header","code":400}}`.
   *  - **A well-formed but wrong/revoked token** answers **`401`** with
   *    `{"error":{"message":"Unauthorized","code":401}}`.
   *
   * A check that only branches on `401` misreports the first case — the
   * credential never reaching the request at all — as some other kind of
   * failure. This hook treats both as "bad credential" and tells them apart in
   * the message.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LokaliseCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { message?: string; code?: number } }
      | null;
    const message = body?.error?.message;

    if (res.status === 400) {
      return {
        ok: false,
        message:
          `Lokalise rejected the request shape (400${
            message ? `: ${message}` : ""
          }). This usually means the token never reached Lokalise in a valid form — reconnect this ` +
          "connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Lokalise rejected the token (401 Unauthorized). Check it was copied exactly and has " +
          "not been deleted in Profile settings > API tokens.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `Lokalise refused the projects list (403${message ? `: ${message}` : ""}). The token ` +
          "is valid but lacks access.",
      };
    }
    return {
      ok: false,
      message: formatLokaliseError(res.status, "GET", PROBE_PATH, JSON.stringify(body ?? {})),
    };
  },

  /**
   * Publish the token's first team name, and nothing else.
   *
   * There is no `/me`-style endpoint for a plain API token (see above), so
   * `GET /teams?limit=1` is the cheapest call that names *something* human for
   * `connectionLabel`. Only `name` is kept — `plan`, `quota_usage` and
   * `quota_allowed` (which `health/quota.ts` reads separately, on its own
   * schedule) never leave this function. A failure here is silent: `test` has
   * already established the token is live, and a missing label must not fail a
   * good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LokaliseCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/teams?limit=1`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { teams?: Array<{ name?: string }> };
      const teamName = body?.teams?.[0]?.name;
      return teamName ? { teamName } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
