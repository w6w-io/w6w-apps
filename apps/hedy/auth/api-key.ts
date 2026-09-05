import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Hedy API key — `Authorization: Bearer <key>`.
 *
 * Verified against Hedy's `securitySchemes.ApiKeyAuth` (`type: apiKey`,
 * `in: header`, `name: Authorization`, description "Add 'Bearer ' followed
 * by your API key") and live probes against `api.hedy.bot` on 2026-09-05.
 *
 * ## The probe: `GET /sessions?limit=1`
 *
 * Hedy's OpenAPI document names no dedicated ping or whoami operation — the
 * only tags are Sessions, Highlights and Webhooks (which publishes no paths
 * at all). Of the two real resources, `GET /sessions` is the cheapest read:
 * it is a plain list of the caller's own meeting sessions, requires a
 * credential, and its response — `{success, data: [...], pagination}}` — never
 * echoes the credential itself. `limit=1` keeps the call to the documented
 * minimum page size.
 *
 * ## Classifying the answer from the BODY, not the status code
 *
 * Live testing (2026-09-05) found this API's error behaviour cleaner than an
 * earlier note about it suggested: unauthenticated and malformed-key calls
 * both answer **401** with a structured body, not 404.
 *
 * | Case                          | Status | Body                                              |
 * | ------------------------------ | ------ | -------------------------------------------------- |
 * | No `Authorization` header       | 401    | `{success:false, error:{code:"missing_api_key"}}`   |
 * | Header present, wrong/fake key  | 401    | `{success:false, error:{code:"invalid_api_key"}}`   |
 * | Genuinely unknown route         | 404    | plain HTML `Cannot GET <path>` — not this API's JSON shape at all |
 * | Rate limited                    | 429    | `{success:false, error:{code:"rate_limit_exceeded"}}` (per spec; not itself proof of a bad key — the same `x-ratelimit-*` headers appear on unauthenticated calls too, so the limiter sits in front of key validation) |
 *
 * so `test` reads `error.code` rather than trusting the HTTP status alone —
 * exactly the "classify from the body" rule this pack follows everywhere,
 * and doubly worth it here because a 404 for an unrelated reason (a typo'd
 * path in a future edit) must never be misread as "the key is fine, this
 * resource just doesn't exist."
 */

export interface HedyCredential {
  apiKey: string;
}

/** The one place the wire format is built, mirrored by `test` below. */
export function authHeaders(credential: Partial<HedyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

export const PROBE_PATH = "/sessions";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key from your Hedy account settings.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From your Hedy account settings. Sent as `Authorization: Bearer <key>`.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The key never appears in a URL or
   * in an Action.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HedyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module doc above for why this endpoint and why the body decides. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HedyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text();
    let body: { success?: boolean; error?: { code?: string; message?: string } } | null = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch { /* not JSON */ }

    if (res.ok && body?.success) return { ok: true };

    const code = body?.error?.code;
    if (code === "missing_api_key") {
      return {
        ok: false,
        message:
          "Hedy received no API key. The credential did not reach the request — reconnect this " +
          "connection.",
      };
    }
    if (code === "invalid_api_key" || res.status === 401) {
      return {
        ok: false,
        message: `Hedy rejected the key (${res.status}${code ? ` ${code}` : ""}${
          body?.error?.message ? `: ${body.error.message}` : ""
        }). Check it was copied exactly from your Hedy account settings.`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Hedy is rate-limiting this host right now; cannot confirm the key is live — " +
          "retry shortly.",
      };
    }
    return {
      ok: false,
      message: `Hedy returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.error?.message ? `: ${body.error.message}` : ""
      }`,
    };
  },
};

export default apiKey;
