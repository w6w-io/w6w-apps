import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Retell AI API key — `Authorization: Bearer <api_key>`.
 *
 * Verified against `components.securitySchemes.api_key` in Retell's OpenAPI
 * document (`type: http`, `scheme: bearer`, description: 'The format is
 * "Bearer YOUR_API_KEY"') and against live probes on 2026-08-24. There is no
 * OAuth surface and no query-parameter form documented anywhere — the bearer
 * header is the whole authentication story.
 */
export interface RetellCredential {
  apiKey: string;
}

/** The one place the wire format is built — `test`/`afterConnect` reuse it so no second copy drifts. */
export function authHeaders(credential: Partial<RetellCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /get-api-key-info`.
 *
 * Chosen over the obvious alternative, `GET /get-concurrency`, because its
 * response schema is the narrower promise: `{org_name, api_key_name}` per the
 * OpenAPI document, versus concurrency figures that are really account
 * capacity data (used instead by `health/quota.ts`, where that IS the point).
 * Retell's own description for this endpoint is "Get info about the API key
 * used to authenticate, and the org that owns it" — it identifies the org and
 * the key's own display name, never the key material itself, so a probe
 * response is safe to store and show verbatim on the health surface.
 *
 * It also needs no scope beyond "this key exists" — there is no narrower or
 * more public alternative to worry about, since every documented endpoint in
 * this API requires the bearer header (confirmed: `GET /get-concurrency` with
 * no header also answers 401, not 200).
 */
export const PROBE_PATH = "/get-api-key-info";

interface ApiKeyInfo {
  org_name?: string;
  api_key_name?: string;
}

/** Retell's two error shapes — see `lib/client.ts` for why both must be read. */
interface RetellErrorBody {
  status?: string;
  message?: string;
  error_message?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from the Retell dashboard (Settings > API Keys). A key authenticates as " +
    "the whole workspace — there is no per-key scoping in this API.",
  connectionLabel: "Retell AI ({{orgName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Retell dashboard > Settings > API Keys.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<RetellCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Reads both of Retell's error shapes so a missing-header failure (which
   * cannot happen from `sign` in practice, but would from a blank field) is
   * reported as clearly as an invalid key.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<RetellCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as RetellErrorBody | null;
    if (body?.error_message) {
      return {
        ok: false,
        message: `Retell received no Authorization header (${body.error_message}) — the ` +
          "credential did not reach the request; reconnect this connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Retell rejected the API key${body?.message ? `: ${body.message}` : ""}. Check ` +
          "it was copied exactly from Settings > API Keys and has not been deleted.",
      };
    }
    return {
      ok: false,
      message: `Retell returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },

  /**
   * Publish the org name (and the key's own label, if it has one) so a list of
   * Connections that would otherwise all read "Retell AI" is distinguishable.
   * Silent on failure — `test` already proved the key is live; a missing label
   * must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<RetellCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as ApiKeyInfo;
      if (!body?.org_name) return {};
      return body.api_key_name
        ? { orgName: body.org_name, apiKeyName: body.api_key_name }
        : { orgName: body.org_name };
    } catch {
      return {};
    }
  },
};

export default apiKey;
