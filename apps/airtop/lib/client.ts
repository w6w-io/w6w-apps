import type { HookContext } from "@w6w/types";

/**
 * Airtop REST client — cloud browser sessions, windows, and the AI-driven page
 * interactions Airtop runs against them.
 *
 * Every path, verb, request/response field and status code in this app was
 * verified on 2026-09-01 against Airtop's own OpenAPI 3.1.0 document
 * (`https://api.airtop.ai/api/openapi.json`, 529,210 bytes, `info.title`
 * "Browser Control API") plus live, unauthenticated probes against
 * `api.airtop.ai` and `status.airtop.ai`. Nothing here came from a third-party
 * integration directory or from memory of a similar vendor.
 *
 * ## `x-fern-audiences` decides what this app covers
 *
 * The spec tags every operation with `x-fern-audiences`: `public` (documented,
 * stable), `beta`, or `alpha`/`private` (internal product surfaces — Airtop's
 * own `Agents`, `GTM Engineer`, `Knowledge Base`, `Team Vault` and `Sensitive
 * Values` features, none of which is meant for a third-party integration).
 * This app implements only the `public`-audience Sessions, Windows, Profiles
 * and Files surface. See `index.ts` and the README for what was left out and
 * why, in particular the `v2` `act`/`extract`/`find-one`/`find-many` interface
 * (tagged `beta` and requires a `jobId` this app has no way to obtain).
 *
 * ## One envelope, two shapes
 *
 * Every response — success or error — is a JSON envelope. A successful call
 * answers `{meta, data, errors, warnings}`; a failed one answers
 * `{httpStatus, message, meta, data, errors, warnings}` with `data: null` and a
 * non-2xx status. The AI-driven window interactions (click, type, scrape, page
 * query, …) use the SAME envelope shape but move the interesting metadata
 * (`status`, `usage.credits`, `screenshots`) into `meta` instead of `data`,
 * because the vendor treats those calls as "one AI turn" rather than "one CRUD
 * read" — {@link AirtopClient.aiRequest} reads both halves.
 *
 * ## Two spellings, two APIs
 *
 * `data` (envelope) always means "the resource"; for the AI interactions it
 * means `{modelResponse: string}` — a natural-language answer, not the parsed
 * JSON a `paginated-extraction` or `page-query` prompt asked for. When a prompt
 * requests `configuration.outputSchema`, the response is still that same
 * string field, containing JSON text the caller must parse — Airtop does not
 * parse it for you, and `outputSchema` itself is a **string** holding a
 * serialized JSON Schema document, not an object.
 */

/** The one and only API origin the OpenAPI document declares (`servers[0].url`). */
export const API_BASE = "https://api.airtop.ai/api";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The envelope every successful response shares. */
export interface Envelope<T> {
  data: T;
  meta?: unknown;
  errors?: unknown[] | null;
  warnings?: unknown[] | null;
}

/** `Pagination`, nested under `data` on the two list endpoints (sessions, files). */
export interface AirtopPagination {
  currentLimit: number;
  currentPage: number;
  finalCount: number;
  hasMore: boolean;
  initialCount: number;
  nextOffset: number;
  numberOfPages: number;
  totalItems: number;
}

/** `ExternalSessionAiResponseMetadata` — the metadata half of an AI interaction's envelope. */
export interface AiResponseMeta {
  requestId?: string;
  actionId?: string;
  cacheHit?: boolean;
  effort?: "low" | "high";
  /** `success`, `partial`, or `failure` — the vendor's own outcome code, distinct from HTTP status. */
  status?: string;
  usage?: { id: string; credits: number };
  screenshots?: Array<{
    dataUrl?: string;
    signedDownloadUrl?: string;
    format?: "base64" | "url";
    fileId?: string;
    fileName?: string;
  }>;
}

/** The result of an AI-driven window interaction: the model's text answer plus its metadata. */
export interface AiResult {
  modelResponse: string;
  meta: AiResponseMeta;
}

interface ErrorEnvelope {
  httpStatus?: number;
  message?: string;
  errors?: Array<{ message?: string; code?: string | null; reason?: string | null }> | null;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both are
 * meaningful values for e.g. `desc` and `offset`.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as Array<keyof T>) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a `multiselect` or free-typed list param as Airtop's documented
 * comma-separated query form (e.g. `sessionIds`, `profileNames`).
 *
 * The OpenAPI document's own parameter descriptions say "a comma-separated
 * list", even though the parameter's `schema` is `explode: true` array style
 * (which normally means a REPEATED key). The prose is what Airtop's own docs
 * and SDKs describe, so it is followed here; this is called out because the
 * two readings genuinely disagree and only one was confirmed against prose.
 */
export function csv(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Airtop's error envelope into one actionable line.
 *
 * Confirmed live (2026-09-01): an unauthenticated `GET /v1/sessions` answers
 * `401 {"httpStatus":401,"message":"missing required header authorization", …}`;
 * a syntactically-plausible but wrong key answers
 * `401 {"httpStatus":401,"message":"invalid api key", …}`. Both distinguish
 * cleanly on `message`, which is why `auth/api-key.ts` reads it rather than
 * the HTTP status alone.
 */
export function formatAirtopError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ErrorEnvelope | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorEnvelope;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) return `Airtop ${status} for ${method} ${path}: ${truncate(raw)}`;

  const detail = (parsed.errors ?? [])
    .map((e) => e?.message)
    .filter((m): m is string => !!m)
    .join("; ");

  const parts = [
    `Airtop ${status} for ${method} ${path}`,
    parsed.message,
    detail || undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class AirtopClient {
  constructor(private ctx: HookContext) {}

  /** Full envelope, unparsed further — used when a caller needs `meta` too. */
  async envelope<T = unknown>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
    const res = await this.send(path, options);
    if (res.status === 204) return { data: undefined as T };
    const text = await res.text();
    if (!text) return { data: undefined as T };
    return JSON.parse(text) as Envelope<T>;
  }

  /** `{"data": …}` in, `data` out. The shape of every CRUD-style endpoint. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const envelope = await this.envelope<T>(path, options);
    return envelope.data;
  }

  /** Status only, for endpoints that answer with no useful body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /**
   * An AI-driven window interaction: click, hover, type, scroll, screenshot,
   * scrape-content, page-query, paginated-extraction, summarize-content,
   * file-input. All ten share the `AiPromptResponse` envelope shape — the
   * text answer lives at `data.modelResponse`, and the credits/status/
   * screenshot metadata lives at `meta`, not `data`.
   */
  async aiRequest(path: string, options: RequestOptions = {}): Promise<AiResult> {
    const res = await this.send(path, options);
    const text = await res.text();
    const body = text
      ? (JSON.parse(text) as { data?: { modelResponse?: unknown }; meta?: AiResponseMeta })
      : {};
    const modelResponse = body.data?.modelResponse;
    return {
      modelResponse: typeof modelResponse === "string"
        ? modelResponse
        : modelResponse === undefined
        ? ""
        : JSON.stringify(modelResponse),
      meta: body.meta ?? {},
    };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatAirtopError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
