import type { HookContext } from "@w6w/types";

/**
 * Jina AI Search Foundation API client (`api.jina.ai`).
 *
 * Everything here was verified on 2026-09-06 against Jina's own machine-readable
 * OpenAPI 3.1 document (`https://api.jina.ai/openapi.json`, 102,860 bytes,
 * `info.version` `2026.07.27.1603`) plus live, unauthenticated/invalid-token
 * probes against `api.jina.ai`. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host — and it is NOT the whole of Jina AI
 *
 * The document declares no `servers` block at all (every path is relative),
 * but every operation resolves against `https://api.jina.ai` in practice —
 * confirmed by live probing every path below. Jina AI actually runs several
 * *separate* products on separate hosts that this OpenAPI document does not
 * cover at all: Reader (`r.jina.ai`), Search (`s.jina.ai`) and DeepSearch. This
 * app only implements the `api.jina.ai` surface — embeddings, reranking,
 * classification and batch jobs — because that is the only surface with a
 * real, machine-readable spec to verify against. See `health/service.ts` for
 * how the Statuspage components are scoped to match.
 *
 * ## Three documented health/readiness paths are dead in production
 *
 * The spec documents `GET /health`, `/ready` and `/live` with no security
 * requirement. Measured live: all three return `404 {"detail":"Invalid
 * endpoint"}` on `api.jina.ai`. These are almost certainly Kubernetes-internal
 * probes exposed in the spec by accident (a FastAPI app that mounts them
 * unconditionally) rather than a public surface — they are not implemented as
 * actions or as the `service` health check here.
 *
 * ## The error envelope is not one shape
 *
 * Every documented error case is `ErrorResponse { detail: string, code?,
 * request_id? }`, and that is what's returned for authentication failures
 * (`AUTH_MISSING_API_KEY`, `AUTH_INVALID_API_KEY`, both measured live). But a
 * `404 RESOURCE_NOT_FOUND` and a bare `500 INTERNAL_ERROR` (both measured live)
 * instead nest `detail` as an OBJECT — `{ detail: { message, code },
 * request_id }`, with no top-level `code`. {@link parseJinaError} normalizes
 * both shapes; reading `body.detail` as a string unconditionally silently
 * stringifies the nested-object case into `"[object Object]"`.
 *
 * ## `/v1/classifiers` answered 500 for every credential tried
 *
 * Both `GET` and `POST /v1/classifiers` (the spec documents both, and both
 * share the identical `operationId: list_classifiers_v1_classifiers_post`, a
 * strong signal the `GET` entry is a documentation duplicate rather than a
 * distinct route) returned `500 INTERNAL_ERROR` for a missing key, an invalid
 * key, AND a syntactically-plausible-but-fake key — the exact same failure
 * regardless of credential state. That rules it out as a credential probe (a
 * 500 says nothing about the credential) and means a real account's first call
 * to `classifiers-list` may hit the same wall; this app still implements the
 * action against the documented `POST` shape and surfaces the vendor's error
 * verbatim rather than papering over it.
 *
 * ## Rate limits are undocumented on the wire for an unauthenticated caller
 *
 * The spec's own description promises `X-RateLimit-Remaining-Requests` /
 * `X-RateLimit-Remaining-Tokens` response headers. None appeared on ANY
 * response captured while building this app (public `/v1/models`, every 401,
 * the 404, the 500) — plausibly because they are only attached to a
 * successfully-authenticated call. `health/quota.ts` reads them opportunistically
 * off the credential probe and reports `unknown` when absent, rather than
 * asserting they exist.
 */

export const API_BASE = "https://api.jina.ai";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body — stringified with content-type application/json. */
  body?: unknown;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Read the response as text instead of parsing JSON (batch output/error JSONL downloads). */
  asText?: boolean;
}

/** Normalized shape of a Jina error, whichever of the two wire envelopes it arrived in. */
export interface JinaErrorInfo {
  status: number;
  message: string;
  /** Machine-readable error code, e.g. `AUTH_INVALID_API_KEY`. Absent for a non-JSON body. */
  code?: string;
  requestId?: string;
}

interface ErrorBody {
  detail?: string | { message?: string; code?: string };
  code?: string;
  request_id?: string;
}

/**
 * Normalize both of Jina's error envelope shapes (see the module doc) into one
 * flat, readable shape. Exported so `sign`/`test` and every action's error path
 * share one reading of the wire rather than each guessing at `detail`'s type.
 */
export function parseJinaError(status: number, body: unknown): JinaErrorInfo {
  const b = (body ?? {}) as ErrorBody;
  if (typeof b.detail === "string") {
    return { status, message: b.detail, code: b.code, requestId: b.request_id };
  }
  if (b.detail && typeof b.detail === "object") {
    return {
      status,
      message: b.detail.message ?? `Jina AI returned HTTP ${status}`,
      code: b.detail.code,
      requestId: b.request_id,
    };
  }
  return { status, message: `Jina AI returned HTTP ${status}` };
}

export class JinaApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(info: JinaErrorInfo) {
    super(
      `Jina AI ${info.status}${info.code ? ` ${info.code}` : ""}: ${info.message}`,
    );
    this.name = "JinaApiError";
    this.status = info.status;
    this.code = info.code;
    this.requestId = info.requestId;
  }
}

/** Thin wrapper over `ctx.fetch` for the Jina AI REST API. Never sets `authorization` — `sign` does. */
export class JinaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const parsed = await res.json().catch(() => null);
      throw new JinaApiError(parseJinaError(res.status, parsed));
    }
    if (res.status === 204) return undefined as T;
    if (options.asText) return (await res.text()) as unknown as T;
    return res.json() as Promise<T>;
  }
}
