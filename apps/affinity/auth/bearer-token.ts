import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatAffinityError } from "../lib/client.ts";

/**
 * Affinity API key — `Authorization: Bearer <key>`.
 *
 * Verified against `api-docs.affinity.co` (fetched 2026-09-05, "Getting
 * Started > Authentication") plus live probes against `api.affinity.co` the
 * same day.
 *
 * ## Two documented auth styles, same key, same endpoints
 *
 * The reference shows the identical v1 API authenticated two ways:
 *
 *   - HTTP Basic — the key as the password, **no username**:
 *     `curl "https://api.affinity.co/api_endpoint" -u : $APIKEY`
 *   - HTTP Bearer — the key as the token:
 *     `curl "https://api.affinity.co/api_endpoint" -H "Authorization: Bearer ${APIKEY}"`
 *
 * Both were confirmed live on 2026-09-05 (`GET /auth/whoami` 401s the same
 * way — see below — whether the credential is sent as a bad Bearer token or
 * as a bad Basic password). Neither is a newer or older API generation; they
 * are two accepted ways to present the same key against the same v1
 * endpoints. This app uses Bearer, because it needs no placeholder username
 * and reads directly as "this is a token", not "this is a password with no
 * username" — and it is the form Affinity's own quickstart curl lines list
 * first.
 *
 * ## Errors are plain text, not the JSON the docs promise
 *
 * Affinity's own docs state every response is JSON. Measured live: a missing
 * or invalid key against `GET /auth/whoami` returns `401` with body
 * `Unauthorized API Key.` under `content-type: text/html;charset=utf-8` —
 * plain text. `test` below reads the body as text and does not attempt to
 * parse or display it as anything else.
 */

export interface AffinityCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<AffinityCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /auth/whoami`.
 *
 * Chosen by reading its documented response body, not by convenience:
 *
 * **(a) It needs a credential and reveals nothing about it.** The documented
 * response is `{tenant: {id, name, subdomain}, user: {id, firstName,
 * lastName, email}, grant: {type, scope, createdAt}}` — instance and caller
 * identity plus authentication *metadata* (grant type/scope/creation time),
 * never the key itself. That is exactly the "echoes identity, not the
 * credential" shape a health/auth probe must have.
 *
 * **(b) It needs no scope beyond "a valid key".** Every action in this app
 * needs at minimum a working key; `/auth/whoami` needs nothing more, so it
 * cannot report a correctly-scoped-but-narrower key as broken the way
 * probing a specific resource list could.
 *
 * **(c) It is free.** The docs state `/rate-limit` and `/auth/whoami` are
 * "exempt from organization-level monthly rate limits" — so running this
 * probe on every health check never eats into the account's monthly quota,
 * which the `quota` health check (`health/quota.ts`) reads from the same
 * account pool.
 */
export const WHOAMI_PATH = "/auth/whoami";

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Affinity Settings > API. Affinity also documents HTTP Basic auth " +
    "(the key as the password, no username) for the same endpoints; this app uses the Bearer " +
    "form.",
  connectionLabel: "Affinity ({{tenantName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Affinity Settings > API. Changes made through the API are attributed to the person " +
        "this key belongs to.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<AffinityCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link WHOAMI_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AffinityCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${WHOAMI_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    // 401 bodies are measured to be plain text ("Unauthorized API Key."),
    // not JSON — read as text and surface the vendor's own wording verbatim
    // rather than guessing a machine code that does not exist here.
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Affinity rejected the API key (401${text ? `: ${text}` : ""}). Check it was ` +
          "copied exactly from Affinity Settings > API and has not been revoked.",
      };
    }
    return {
      ok: false,
      message: formatAffinityError(res.status, "GET", WHOAMI_PATH, text),
    };
  },

  /**
   * Publish the instance name and the caller's own name — nothing else.
   *
   * `grant` (auth metadata) and the raw email are deliberately left off the
   * connection label; the tenant name and user name are enough to tell one
   * Connection apart from another without echoing more than needed.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<AffinityCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${WHOAMI_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        tenant?: { name?: string; subdomain?: string };
        user?: { firstName?: string; lastName?: string };
      };
      const tenantName = body?.tenant?.name;
      if (!tenantName) return {};
      const userName = [body.user?.firstName, body.user?.lastName].filter(Boolean).join(" ");
      return userName ? { tenantName, userName } : { tenantName };
    } catch {
      return {};
    }
  },
};

export default bearerToken;
