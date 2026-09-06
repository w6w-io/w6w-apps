import type { AuthDefinition } from "@w6w/types";
import { API_BASE, parseJinaError } from "../lib/client.ts";

/**
 * Jina AI API key — `Authorization: Bearer jina_<key>`.
 *
 * Verified against the OpenAPI document's `components.securitySchemes.HTTPBearer`
 * and its own Authentication section ("Include your API key in the
 * `Authorization` header: `Authorization: Bearer jina_YOUR_API_KEY`"), plus
 * live probes on 2026-09-06. There is no OAuth surface and no separate API
 * secret — the header below is the whole authentication story. Every
 * operation under `/v1/*` requires it except `GET /v1/models` and
 * `GET /v1/models/{model_id}`, which the document marks `security: null`.
 */

export interface JinaCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<JinaCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v1/batches?limit=1` was picked by reading the live wire, not by
 * convenience:
 *
 * **(a) It requires a credential and classifies cleanly.** Measured live: no
 * `Authorization` header answers `401 {"code":"AUTH_MISSING_API_KEY"}`; a
 * syntactically-plausible fake key answers `401 {"code":"AUTH_INVALID_API_KEY"}`.
 * Both are read from the vendor's own `code` field per {@link parseJinaError},
 * never inferred from the bare 401 status alone — Jina uses 401 as a generic
 * auth-family status.
 *
 * **(b) It costs nothing.** Listing batch job history does not consume tokens
 * or trigger inference, unlike every embeddings/rerank/classify call, so this
 * app never spends a caller's balance just to answer "is this key alive?".
 *
 * **(c) It returns no credential material.** `BatchStatus` entries carry
 * `batch_id`, `status`, `model`, timestamps and a short-lived signed
 * `output_url` for a job's OWN prior output — never the API key itself.
 * `test`/`sign` never forward the response body anywhere, so that distinction
 * doesn't even need enforcing here, but it is why this endpoint was preferred
 * over, say, echoing back account settings.
 *
 * This is deliberately NOT `GET /v1/classifiers` — see `lib/client.ts` for why
 * that endpoint answers `500` regardless of credential and cannot tell a live
 * key from a dead one.
 */
export const PROBE_PATH = "/v1/batches";

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from jina.ai/api-dashboard/key-manager. New accounts receive 10M free tokens.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "jina.ai/api-dashboard/key-manager — a 65-character key starting with `jina_`.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<JinaCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `GET /v1/batches?limit=1` and not `/v1/classifiers`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<JinaCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const info = parseJinaError(res.status, body);
    if (info.code === "AUTH_MISSING_API_KEY" || info.code === "AUTH_INVALID_API_KEY") {
      return {
        ok: false,
        message: `Jina AI rejected the API key: ${info.message}`,
      };
    }
    return {
      ok: false,
      message: `Jina AI returned HTTP ${info.status}${info.code ? ` (${info.code})` : ""} for ` +
        `${PROBE_PATH}: ${info.message}`,
    };
  },
};

export default bearerToken;
