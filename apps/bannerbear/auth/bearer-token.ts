import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Bannerbear API key — `Authorization: Bearer <key>`.
 *
 * Verified against the OpenAPI 3.0 document's `components.securitySchemes.bearerAuth`
 * (`type: http, scheme: bearer`) and the prose reference's Authentication
 * section, both fetched 2026-08-29. There is no OAuth surface, no API secret
 * separate from the key, and no sandbox environment — the header shown below
 * is the entire authentication story.
 *
 * ## Scoped keys are a documented, supported configuration
 *
 * "API Keys can be scoped to specific resources and actions (for example
 * images:write), and can be restricted to specific browser origins. An
 * unscoped key has full access." A key scoped to, say, only `images:write`
 * must be treated as healthy, not broken — which is exactly what picks the
 * probe below: `/account` needs no resource scope at all, because the
 * documented scope vocabulary (`images:*`, `image_templates:*`,
 * `animations:*`, `animation_templates:*`, `batches:*`, `webhooks:*`,
 * `instant_urls:*`, `publications:*`, `assets:*`, `tools:*`, `workflows:*`)
 * has no `account:*` pair — account metadata sits outside every scope.
 */

export interface BannerbearCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<BannerbearCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

interface AccountBody {
  uid?: string;
  workspace?: string;
  plan?: string;
  quota?: { max?: number; current?: number; remaining?: number };
  api_key?: { name?: string; scopes?: string[]; allowed_origins?: string[] };
}

/**
 * The credential-liveness probe.
 *
 * `GET /account` was picked by reading the scope vocabulary, not by
 * convenience:
 *
 * **(a) It requires a credential.** No unauthenticated route exists on this
 * API at all — every one of the 44 documented paths sits under
 * `security: [{bearerAuth: []}]` at the document root, with no per-path
 * override.
 *
 * **(b) It is not resource-scoped.** See the module doc — the scope
 * vocabulary is entirely `resource:read`/`resource:write` pairs for the eleven
 * catalogued resources, and account metadata is not one of them. The obvious
 * alternative, `GET /image_templates`, is exactly the kind of call a
 * correctly-scoped `images:write`-only key may legitimately be refused,
 * which would report a working Connection as broken.
 *
 * **(c) It returns no credential material.** Its response is
 * `{uid, workspace, plan, quota, api_key: {name, scopes, allowed_origins}}` —
 * plan metadata and the key's OWN declared scopes, never the key value
 * itself.
 */
export const PROBE_PATH = "/account";

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description: "Paste a V5 API key from app.bannerbear.com/v5/api_keys. A key scoped to only the " +
    "resources a workflow needs is fine, and recommended.",
  connectionLabel: "Bannerbear ({{workspace}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.bannerbear.com/v5/api_keys — create, scope, restrict by origin, or roll a key " +
        "there. Bannerbear's v4 keys are not compatible with this v5 surface.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<BannerbearCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/account` and not a resource list. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BannerbearCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "Bannerbear rejected the API key (401). Check it was copied exactly from " +
          "app.bannerbear.com/v5/api_keys and has not been rolled or deleted.",
      };
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => null) as { message?: string } | null;
      return {
        ok: false,
        message: `Bannerbear refused the account read (403)${
          body?.message ? `: ${body.message}` : ""
        }`,
      };
    }
    return { ok: false, message: `Bannerbear returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the workspace name, and nothing else.
   *
   * `GET /account` also returns `plan` and the key's own `scopes` /
   * `allowed_origins` — none of which is a credential, but none of which
   * belongs on a Connection label either. Only `workspace` is kept.
   *
   * A failure here is deliberately silent: `test` already established the key
   * is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<BannerbearCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as AccountBody;
      return body.workspace ? { workspace: body.workspace } : {};
    } catch {
      return {};
    }
  },
};

export default bearerToken;
