import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Glide API auth token — `Authorization: Bearer <token>`.
 *
 * Verified against Glide's own OpenAPI 3.1 document (`components.securitySchemes.BearerAuth`,
 * fetched 2026-09-06) and its `docs/classic-api/general/authentication` and `.../errors` pages,
 * plus live probes against `api.glideapps.com` the same day.
 *
 * ## The token is team-wide, not app-scoped
 *
 * From Glide's own docs: the token "is unique to your Glide user" and "is scoped to your Glide
 * team, so it has access to all applications and data in your team." There is no per-app or
 * per-table scoping to ask for — unlike Apify's scoped tokens, every Connection using this method
 * reaches every Big Table the team owns.
 *
 * ## An invalid token answers 404, not 401
 *
 * Glide's errors page states this explicitly: **"Using an auth token that does not exist or is
 * incorrect will result in a `404` response status,"** with body
 * `{"error":{"type":"request_error","message":"API key not found, or duplicate IN****ID"}}`. A
 * probe that branched on `res.status === 401` would never fire; `test` below classifies by the
 * response body's `error.type`, per the pack-wide rule that a credential is never judged by status
 * code alone.
 */

export interface GlideCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built, so `test` and `afterConnect` exercise the same header
 * `sign` does.
 */
export function authHeaders(credential: Partial<GlideCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /tables`.
 *
 * Chosen because it is the narrowest read this token can make: it needs no
 * table id, no permission beyond the token's own team scope (Glide's API has
 * no finer-grained scoping to be refused by), and its response —
 * `{"data": [{"id", "name"}, ...]}` — carries table identity, never anything
 * that could be mistaken for credential material.
 */
export const PROBE_PATH = "/tables";

interface ListTablesBody {
  data?: Array<{ id?: string; name?: string }>;
}

interface GlideErrorBody {
  error?: { type?: string; message?: string };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Auth Token",
  description:
    "Paste the API auth token from the Glide Data Editor (Settings). It is scoped to your whole " +
    "Glide team, so this connection reaches every Big Table the team owns.",
  connectionLabel: "Glide ({{tableCount}} Big Tables)",
  fields: [
    {
      key: "apiToken",
      label: "API Auth Token",
      type: "secret",
      required: true,
      hint:
        "Found in the Glide Data Editor. Treat it as a secret — it is not checked into source " +
        "control or exposed client-side, and it reaches every app and Big Table in your team.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<GlideCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. Classifies by response body, never by status code alone. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GlideCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });

    if (res.ok) {
      const body = await res.json().catch(() => null) as ListTablesBody | null;
      if (!body || !Array.isArray(body.data)) {
        return {
          ok: false,
          message: "Glide returned an unexpected response shape for GET /tables",
        };
      }
      return { ok: true };
    }

    const body = await res.json().catch(() => null) as GlideErrorBody | null;
    const type = body?.error?.type;

    // Documented explicitly: an invalid/unknown token answers 404 with
    // error.type "request_error" — never 401. Classified by body, not status.
    if (type === "request_error") {
      return {
        ok: false,
        message: `Glide rejected the API auth token: ${
          body?.error?.message ?? "token not found or incorrect"
        }. Copy it again from the Glide Data Editor.`,
      };
    }
    return {
      ok: false,
      message: `Glide returned HTTP ${res.status} for GET /tables${type ? ` (${type})` : ""}${
        body?.error?.message ? `: ${body.error.message}` : ""
      }`,
    };
  },

  /**
   * Publish how many Big Tables this team's token reaches. Not the table list
   * itself — a full inventory is more of the team's schema than a connection
   * label needs — just a count, from the same read `test` already proved safe.
   *
   * Deliberately silent on failure: `test` already established the token is
   * live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<GlideCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as ListTablesBody;
      const tableCount = Array.isArray(body?.data) ? body.data.length : undefined;
      return tableCount === undefined ? {} : { tableCount };
    } catch {
      return {};
    }
  },
};

export default apiToken;
