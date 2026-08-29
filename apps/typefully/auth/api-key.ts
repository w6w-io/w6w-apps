import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Typefully API key — `Authorization: Bearer <key>`.
 *
 * Verified against the vendor's OpenAPI document (`components.securitySchemes.
 * PublicAPIAuthentication` = `{type: "http", scheme: "bearer"}`) and its own
 * "Authentication" doc section on 2026-08-29: "All requests require a Bearer
 * token in the Authorization header … Generate your API key from your
 * Typefully settings." There is no query-parameter form and no OAuth surface.
 *
 * ## Scoped by the creating user, not by the key
 *
 * Typefully states the key "inherit[s] the same permissions as the user who
 * created them" — access to a social set (account) is per-user, not
 * per-key. There is no narrower, resource-scoped token to prefer (unlike
 * Apify's scoped tokens), so this is the only credential shape this app has.
 *
 * ## X automation compliance
 *
 * The vendor's docs open with a compliance notice this app repeats rather than
 * silently drops: automating X posting must follow X's own automation and
 * platform rules, and Typefully's API "is meant to create personal automations
 * and workflows" rather than to power a third-party app serving X's API to
 * other people. See `README.md`.
 */

export interface TypefullyCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `test` exercises the same header `sign` does. */
export function authHeaders(credential: Partial<TypefullyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/me`.
 *
 * Chosen because it is the one endpoint in this surface that (a) requires a
 * credential — the OpenAPI document lists a `401 UNAUTHORIZED` "Invalid or
 * missing API key" response and nothing else needs no auth at all — and (b)
 * its response, `UserResponse`, carries only account identity (`id`, `name`,
 * `email`, `profile_image_url`, `signup_date`, `api_key_label`) and no
 * credential material of any kind, unlike a proxy password or signing secret
 * some other vendors leak from an equivalent whoami. It also needs no
 * particular social-set access, so it stays a valid probe no matter which
 * accounts this key's user can reach.
 */
export const PROBE_PATH = "/me";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key generated from Typefully → Settings → API. The key inherits the " +
    "permissions of the user who created it — access to a social set (account) is " +
    "per-user, not per-key.",
  connectionLabel: "Typefully ({{name}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Typefully → Settings → API. Generate a key dedicated to this connection.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<TypefullyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/v2/me` and not a social-set-scoped endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TypefullyCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    if (!apiKeyValue) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: apiKeyValue }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { code?: string; message?: string } }
      | null;
    const code = body?.error?.code;

    if (res.status === 401 || code === "UNAUTHORIZED") {
      return {
        ok: false,
        message: `Typefully rejected the API key (${res.status}${code ? ` ${code}` : ""}). ` +
          "Check it was copied exactly and has not been revoked in Settings → API.",
      };
    }
    if (res.status === 429 || code === "RATE_LIMITED") {
      return {
        ok: false,
        message: "Typefully rate-limited the credential check. The key may still be valid — " +
          "try again shortly.",
      };
    }
    return {
      ok: false,
      message: `Typefully returned HTTP ${res.status}${code ? ` ${code}` : ""} for ${PROBE_PATH}` +
        `${body?.error?.message ? `: ${body.error.message}` : ""}`,
    };
  },

  /**
   * Publish the account's display name so a list of Connections doesn't all
   * read "Typefully". Failure here is deliberately silent: `test` already
   * established the key is live, and a missing label must not fail a good
   * Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TypefullyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/me`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; email?: string; id?: number };
      if (!body?.name) return {};
      return { name: body.name, email: body.email, userId: body.id };
    } catch {
      return {};
    }
  },
};

export default apiKey;
