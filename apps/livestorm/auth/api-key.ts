import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Livestorm private API token — `Authorization: <token>`, no `Bearer ` prefix.
 *
 * Verified against the vendor's own OpenAPI `securitySchemes.api_key` (`type: apiKey`,
 * `in: header`, `name: Authorization`) plus live probes against `api.livestorm.co` on
 * 2026-09-06 (see `lib/client.ts`'s module doc for the exact requests/responses). Livestorm
 * also documents a separate `oauth2` scheme, but that flow is for a browser app-install (a
 * third party building an installable Livestorm integration, with its own client
 * id/secret/redirect registration); the private token is the one credential a headless,
 * server-to-server workflow host can use without a registered OAuth app, so this is the only
 * Auth method this app declares.
 *
 * ## Why `Bearer ` must never be added
 *
 * Livestorm's Doorkeeper-backed OAuth2 layer also reads the `Authorization` header, and a
 * `Bearer `-prefixed value is routed to ITS token store instead of the private-token store —
 * a perfectly valid private token sent with a `Bearer ` prefix is rejected as an invalid OAuth2
 * access token (`www-authenticate: Bearer realm="Doorkeeper", error="invalid_token"`), not as a
 * bad private token. `sign` below sends the raw value.
 */

export interface LivestormCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<LivestormCredential>): Record<string, string> {
  return { authorization: credential.apiToken ?? "" };
}

/**
 * `GET /v1/ping` — "Test whether your API token or OAuth2 access token works."
 *
 * Chosen over every other candidate because its documented `200` response has NO body at all
 * (`content: {}` in the OpenAPI document) — it cannot echo back anything, credential or
 * otherwise, unlike `GET /me` or `GET /organization`, which return real workspace data. It
 * needs no scope beyond a live token and costs nothing beyond the rate-limit budget every call
 * already spends.
 */
export const PROBE_PATH = "/ping";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste a private API token from Livestorm > Settings > Integrations > API. Sent as a raw " +
    "Authorization header value (no 'Bearer ' prefix) — see this app's README for why that " +
    "matters.",
  connectionLabel: "Livestorm ({{organizationName}})",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Livestorm > Settings > Integrations > API. Generate a token dedicated to this " +
        "connection.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<LivestormCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/ping` and not `/me` or `/organization`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LivestormCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/vnd.api+json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { errors?: Array<{ title?: string; detail?: string; status?: string }> }
      | null;
    const err = body?.errors?.[0];

    if (res.status === 401) {
      return {
        ok: false,
        message: `Livestorm rejected the token (401${err?.status ? ` ${err.status}` : ""})` +
          `${err?.detail ? `: ${err.detail}` : ""}. Check it was copied exactly and has not ` +
          "been revoked in Livestorm > Settings > Integrations > API.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Livestorm refused the request (403 — workspace blocked)` +
          `${err?.detail ? `: ${err.detail}` : ""}.`,
      };
    }
    return { ok: false, message: `Livestorm returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the organization's name for `connectionLabel`.
   *
   * Reads `GET /organization`, not `GET /me` — see `lib/client.ts`'s module doc for why `/me`'s
   * documented schema cannot be trusted to carry a user-identifying field. A failure here is
   * deliberately silent: `test` has already established the token is live, and a missing label
   * must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LivestormCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/organization`, {
        headers: { accept: "application/vnd.api+json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        data?: { id?: string; attributes?: { name?: string } };
      };
      const organizationName = body?.data?.attributes?.name;
      const organizationId = body?.data?.id;
      if (!organizationName) return {};
      return organizationId ? { organizationName, organizationId } : { organizationName };
    } catch {
      return {};
    }
  },
};

export default apiKey;
