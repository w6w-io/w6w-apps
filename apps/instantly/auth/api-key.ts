import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatInstantlyError } from "../lib/client.ts";

/**
 * Instantly API key — `Authorization: Bearer <key>`.
 *
 * Verified against `developer.instantly.ai/getting-started/authorization`
 * ("Add a new header to your request, called authorization, with the value:
 * Bearer {{key}}") and live probes against `api.instantly.ai` on 2026-08-29.
 * There is no alternate presentation (no `?api_key=` query form, no separate
 * `x-api-key` header) and no OAuth surface for third-party apps — the OpenAPI
 * document declares exactly one security scheme, `ApiKeyAuth` (`type: http`,
 * `scheme: bearer`), applied globally.
 *
 * ## Every route is scope-gated, and there is no unscoped key
 *
 * Instantly's key-creation screen (Settings > Integrations > API Keys) makes
 * the caller tick individual scopes — `campaigns:read`, `leads:all`,
 * `all:read`, … — and the OpenAPI document names the scopes each route accepts
 * right in that route's own description. There is no "give me everything"
 * default: a key created with only, say, `leads:all` will be refused on every
 * Campaign or Account route. That is the constraint this probe was chosen
 * under, and it is why a refusal here reports the vendor's own reason rather
 * than a bare "invalid credential".
 *
 * ## The probe is `GET /api/v2/campaigns?limit=1`
 *
 * Instantly publishes no scope-free "whoami" at all — even
 * `GET /api/v2/workspaces/current`, the obvious candidate, is documented as
 * requiring `workspaces:read` specifically. Since every route needs *some*
 * scope, the probe reads the one resource this app's own action surface is
 * built around: a key that cannot list campaigns cannot usefully drive this
 * app's Campaign actions regardless of what else it is scoped for, and a
 * single campaign row carries no secret. `campaigns:read` (or `campaigns:all`
 * / `all:read` / `all:all`) is the scope this probe needs; a key scoped away
 * from Campaigns entirely reports that explicitly rather than as a generic
 * failure (see the `403` branch of {@link apiKey.test | test} below).
 *
 * Confirmed live: an unauthenticated request answers
 * `401 {"message":"Missing authorization header"}`, and a syntactically
 * plausible but wrong key answers `401 {"message":"Invalid API key"}` — two
 * different problems the vendor already distinguishes in `message`.
 */

export interface InstantlyCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `test` exercises the same path `sign` does. */
export function authHeaders(credential: Partial<InstantlyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module doc for why this endpoint and not `GET /workspaces/current`. */
export const PROBE_PATH = "/campaigns";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API v2 key from Instantly > Settings > Integrations > API Keys. Select at least " +
    "the scopes the workflows using this connection need (Campaigns, Leads and Accounts cover " +
    "most of this app's actions) — a key scoped away from a resource is refused on every action " +
    "that touches it.",
  connectionLabel: "Instantly ({{workspaceName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Instantly > Settings > Integrations > API Keys > Create API Key. Copy it immediately " +
        "— Instantly does not show it again.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<InstantlyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<InstantlyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const url = `${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`;
    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let message: string | undefined;
    try {
      message = (JSON.parse(raw) as { message?: string }).message;
    } catch { /* not JSON */ }

    if (res.status === 401) {
      return {
        ok: false,
        message: message === "Missing authorization header"
          ? "Instantly received no key. The credential did not reach the request — reconnect " +
            "this connection."
          : `Instantly rejected the key (401${message ? `: ${message}` : ""}). Check it was ` +
            "copied exactly and has not been revoked in Instantly > Settings > Integrations > " +
            "API Keys.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Instantly refused the campaigns read (403${message ? `: ${message}` : ""}). ` +
          "The key is valid but not scoped for Campaigns — add campaigns:read (or all:read) in " +
          "Instantly > Settings > Integrations > API Keys.",
      };
    }
    if (res.status === 402) {
      return {
        ok: false,
        message: `Instantly reports no active paid plan for this workspace (402${
          message ? `: ${message}` : ""
        }).`,
      };
    }
    return {
      ok: false,
      message: formatInstantlyError(res.status, "GET", `${API_PREFIX}${PROBE_PATH}`, raw),
    };
  },

  /**
   * Publish the workspace's name, and nothing else.
   *
   * `GET /workspaces/current` needs `workspaces:read`, a scope this probe does
   * not require of `test` — so a Connection can be live and correctly
   * scoped for every action it needs while this call still 403s. That is
   * expected and silent: `test` has already established the key is live, and a
   * missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<InstantlyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/workspaces/current`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; id?: string };
      if (!body?.name) return {};
      return body.id ? { workspaceName: body.name, workspaceId: body.id } : {
        workspaceName: body.name,
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
