import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatLglError } from "../lib/client.ts";

/**
 * Bearer token — confirmed live 2026-09-05, NOT the HTTP Basic a bare,
 * credential-less request's `WWW-Authenticate: Basic realm="API"` challenge
 * implies (see `lib/client.ts`'s module doc for the full comparison). A
 * request carrying `Authorization: Bearer <garbage>` gets a second, more
 * specific challenge instead — `WWW-Authenticate: Bearer realm="Rack::OAuth2
 * Protected Resources"` — confirming the real scheme is Bearer. Independently
 * confirmed by a third-party open source LGL client
 * (`lgl-mcp-server`/`WillHeadlee/Little-Green-Light-MCP-Server`), which calls
 * this same host with `Authorization: Bearer ${LGL_API_KEY}`.
 *
 * LGL's own machine-readable API reference (the Swagger 1.2 docs this app is
 * otherwise built from) declares no `authorizations` block at all — the token
 * generation flow itself is therefore NOT independently confirmed against a
 * vendor reference and is described here only at the level a connecting user
 * needs (an account-level access token), without inventing a specific menu
 * path.
 *
 * ## The probe
 *
 * `GET /api/v1/constituents.json?limit=1` — the cheapest documented read,
 * bounded to one record. It requires a live token and returns nothing beyond
 * the connecting organization's own constituent data — never anything that
 * could be mistaken for the credential itself.
 *
 * ## Classify from the body, not the bare status
 *
 * A live probe with a garbage/expired token answers `401` with
 * `{"error":"invalid_token","error_description":"..."}` — `test` reads that
 * structured body rather than trusting the status code alone, since a
 * `WWW-Authenticate: Basic` header is ALSO present on the credential-less
 * case and would misclassify the failure if read instead of the body.
 */

export interface LglCredential {
  token: string;
}

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "A Little Green Light API access token for your account. Generated from your LGL account " +
    "settings — LGL's own API reference does not document the exact steps, so consult LGL " +
    "support if you cannot find the option.",
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Your account's LGL API access token.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Bearer header and returns.
   */
  sign({ request, credential }) {
    const { token } = credential as Partial<LglCredential>;
    request.headers["authorization"] = `Bearer ${token ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as Partial<LglCredential>;
    if (!token) {
      return { ok: false, message: "credential missing token" };
    }

    const url = `${API_BASE}${API_PREFIX}/constituents.json?limit=1`;
    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 401) {
      const parsed = (() => {
        try {
          return JSON.parse(raw) as { error?: string; error_description?: string };
        } catch {
          return null;
        }
      })();
      const detail = parsed?.error_description ?? parsed?.error;
      return {
        ok: false,
        message: `LGL rejected the access token (401${detail ? `: ${detail}` : ""}). Check the ` +
          "token was copied exactly and has not been revoked or regenerated.",
      };
    }
    return {
      ok: false,
      message: formatLglError(res.status, "GET", "/api/v1/constituents.json", raw),
    };
  },
};

export default bearerToken;
