import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Apify API token — `Authorization: Bearer <token>`.
 *
 * Verified against Apify's OpenAPI 3.1 document (`components.securitySchemes`,
 * fetched 2026-08-11) and live probes against `api.apify.com` on the same day.
 *
 * ## Header, never the query parameter
 *
 * Apify documents **two** ways to present the token: the `Authorization: Bearer`
 * header, and a `?token=` query parameter. Both work. This app only ever uses
 * the header, and the query form is not reachable from any Action, because the
 * vendor's own security note says why: "URLs are often stored in browser
 * history and server logs. This creates a chance for someone unauthorized to
 * access your API token." A workflow host logs request URLs; it does not log
 * request headers.
 *
 * ## Scoped tokens
 *
 * An Apify token may be **scoped**: limited to named account-level permissions
 * and to specific resources. A scoped token is a supported, recommended
 * configuration for a third-party integration — Apify's own guidance is to
 * "create a scoped token that can only run the Actor you need, and share it
 * with the service" — so this app must treat one as healthy, not broken. That
 * constraint is what picks the probe below, and it is why an Action failing
 * with `insufficient-permissions` reports that code verbatim instead of a bare
 * 403.
 *
 * Apify does not allow a scoped token to create or modify Actors at all; this
 * app declares no such Action, so nothing here requires an unscoped token.
 */

export interface ApifyCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<ApifyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v2/users/me/limits` was chosen by reading the response *schema* and by
 * measuring the wire on 2026-08-11, not by its name:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `401 token-not-provided`; with a syntactically plausible but fake token it
 * answers `401 user-or-token-not-found`. Both were observed live. That rules
 * out the tempting alternative `GET /v2/store`, which is **public** — it
 * answers `200` with no credential at all, so a Connection whose token never
 * got attached would sail through a probe against it.
 *
 * **(b) It is not resource-scoped.** Apify's scoped tokens restrict access to
 * *resources* — Actors, tasks, datasets, key-value stores, request queues,
 * schedules. `/v2/users/me/limits` is account metadata and belongs to no
 * resource, so the narrowest usable token still reaches it. The obvious
 * alternatives are exactly the resource lists (`/v2/actor-tasks`,
 * `/v2/datasets`) that a correctly-scoped token may legitimately be refused,
 * which would report a working Connection as broken.
 *
 * **(c) It returns no credential material.** Its response is
 * `{data: {monthlyUsageCycle, limits, current}}` — plan ceilings and current
 * usage numbers, nothing else.
 *
 * And it is specifically **not** `GET /v2/users/me`, the endpoint every other
 * integration reaches for. See {@link WHY_NOT_USERS_ME}.
 */
export const PROBE_PATH = "/users/me/limits";

/**
 * Why the whoami is not the probe — kept as an exported constant so the reason
 * survives the next person who notices `/v2/users/me` is shorter.
 *
 * `GET /v2/users/me` returns `UserPrivateInfo`, and that schema contains
 * `proxy: {password, groups}` where `password` is the account's **Apify Proxy
 * password** — a live credential for `proxy.apify.com`, returned in full to any
 * caller holding the API token. A health probe's response is stored and
 * displayed; using this endpoint would copy a working credential into the
 * health surface on every check, forever. Follow Up Boss's `/me` and Mailjet's
 * `/apikey` are the same trap, and both are already banned pack-wide.
 *
 * The endpoint is still reachable as the `account-get` Action, which deletes
 * that one field before returning. A probe cannot do the same thing safely,
 * because there is no reason to run it at all: `/users/me/limits` answers the
 * question "is this token live?" without ever putting the proxy password on the
 * wire.
 */
export const WHY_NOT_USERS_ME =
  "GET /v2/users/me returns proxy.password, the account's Apify Proxy credential";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste an API token from Apify Console > Settings > API & Integrations. A scoped token is " +
    "fine, and recommended: give it only the permissions the workflows using this connection " +
    "need.",
  connectionLabel: "Apify ({{username}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Apify Console > Settings > API & Integrations. Use a token dedicated to this " +
        'connection rather than one shared with other services, and toggle "Limit token ' +
        'permissions" to scope it.',
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ApifyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not the whoami. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ApifyCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { type?: string; message?: string } }
      | null;
    const type = body?.error?.type;

    if (type === "token-not-provided") {
      return {
        ok: false,
        message:
          "Apify received no token. The credential did not reach the request — reconnect this " +
          "connection.",
      };
    }
    if (type === "user-or-token-not-found" || res.status === 401) {
      return {
        ok: false,
        message:
          `Apify rejected the token (${res.status}${type ? ` ${type}` : ""}). Check it was ` +
          "copied exactly and has not been deleted in Apify Console > Settings > API & " +
          "Integrations.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Apify refused the account-limits read (403${type ? ` ${type}` : ""})` +
          `${body?.error?.message ? `: ${body.error.message}` : ""}`,
      };
    }
    return { ok: false, message: `Apify returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the account's username, and nothing else.
   *
   * The username is worth having: Apify's `username~resource-name` addressing
   * form is unusable without knowing it, and a list of Connections that all read
   * "Apify" is unusable too.
   *
   * It comes from `GET /v2/users/me`, the endpoint this app otherwise avoids —
   * so this hook takes exactly two fields off the response and drops the rest on
   * the floor. `proxy` (which carries the proxy password), `email` and `plan`
   * never leave this function. The one endpoint that names the account is the
   * leaky one; the answer is to narrow what is *kept*, not to publish the whole
   * object and hope nothing reads it.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ApifyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/users/me`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: { username?: string; id?: string } };
      const username = body?.data?.username;
      const userId = body?.data?.id;
      if (!username) return {};
      return userId ? { username, userId } : { username };
    } catch {
      return {};
    }
  },
};

export default apiToken;
