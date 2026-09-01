import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Bubble's Data API and Workflow API — verified against manual.bubble.io
 * 2026-09-01: `help-guides/integrations/api/the-bubble-api/*` (long-form) and
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests` (the
 * short-form technical reference, which is where the exact request/response
 * shapes below come from).
 *
 * ## There is no vendor host
 *
 * Bubble is a no-code **app builder**: every Bubble application is its own
 * deployment with its own root URL — `https://<appname>.bubbleapps.io`, or a
 * connected custom domain — and its own database schema. There is no shared
 * `api.bubble.io` this app could call. So, exactly like `gitea`, `mautic` and
 * `tableau` in this pack, the base URL is a connection field and the egress
 * allowlist is `["*"]` — the price of an app whose address only the app's own
 * builder knows.
 *
 * ## The URL also carries the branch/version
 *
 * A Bubble app has (at least) two live roots, and picking the wrong one is
 * the most common mistake:
 *   - **Live**: `https://<appname>.bubbleapps.io/api/1.1/...`
 *   - **Development, Main branch**: `.../version-test/api/1.1/...`
 *   - **Development, a custom branch**: `.../<branch-id>/api/1.1/...`
 * Rather than reconstructing this from a separate "environment" field, the
 * connection simply stores the already-versioned root the builder copied out
 * of Settings → API (e.g. `https://myapp.bubbleapps.io/version-test`), and
 * every request appends `/api/1.1/...` to it.
 */

/** Public (redacted-safe) connection metadata. */
export interface BubbleConnectionDisplay {
  /** The app's versioned root, e.g. `https://myapp.bubbleapps.io/version-test`. */
  baseUrl?: string;
}

/**
 * Normalise a user-typed Bubble root URL.
 *
 * People paste the bare `myapp.bubbleapps.io`, a full `.../api/1.1/obj/...`
 * endpoint they copied mid-troubleshooting, or a trailing slash. All of these
 * should resolve to the same root Bubble's own docs show:
 * `https://myapp.bubbleapps.io/version-test`.
 *
 * A missing scheme defaults to `https`, and any `/api/1.1/...` suffix is
 * stripped — Bubble's own examples paste the API root, so a pasted
 * `.../api/1.1/obj/thing` is entirely plausible, and silently producing
 * `.../api/1.1/obj/thing/api/1.1/obj` would be a baffling 404.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Bubble app URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Bubble app URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Bubble app URL has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  const apiIdx = path.indexOf("/api/1.1");
  if (apiIdx >= 0) path = path.slice(0, apiIdx);
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the app's root off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as BubbleConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Bubble connection records no app URL — reconnect it so the URL can be stored",
  );
}

/**
 * A Data API type name, formatted the way Bubble's Data API requires:
 * lowercase, spaces removed. Bubble's own example: "Rental Unit" → `rentalunit`.
 */
export function formatTypeName(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("`type` is required");
  return trimmed.toLowerCase().replace(/\s+/g, "");
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function parseJson(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** One entry of the Data API's `constraints` query parameter. */
export interface DataConstraint {
  key: string;
  constraint_type: string;
  value?: unknown;
}

/**
 * Bubble's two error shapes, both confirmed live against `app.bubbleapps.io`
 * 2026-09-01 — neither matches the flat `{message}` the generated Swagger
 * document's `responses` schema claims:
 *
 *   - **Data API errors** (missing type, disabled Data API, bad constraint, …)
 *     nest under `body`: `{"statusCode":404,"body":{"status":"NOT_FOUND",
 *     "message":"This application does not expose a Data API"}}`.
 *   - **Auth-layer errors** (bad or expired token) are a different, wholly
 *     undocumented shape: `{"error_class":"Unauthorized","args":{"code":"…"},
 *     "message":null,"translation":"Invalid or expired token: <token>"}` —
 *     note that `translation` echoes the credential value that was sent.
 *     `error_class`/`translation` are therefore NEVER surfaced verbatim by
 *     this app (see `readErrorMessage` below and `auth/admin-token.ts`'s
 *     `test` hook) — only the nested `body.message` shape is safe to show.
 */
export interface BubbleErrorBody {
  status?: string;
  message?: string;
  statusCode?: number;
  body?: { status?: string; message?: string };
  error_class?: string;
}

/**
 * Extracts a safe-to-display message from a parsed Bubble error body.
 * Deliberately refuses the `error_class`/`translation` shape (see
 * `BubbleErrorBody`) since `translation` can echo back the credential that
 * was sent — callers that need to distinguish an auth failure use the HTTP
 * status instead. Exported so `auth/admin-token.ts`'s `test` hook applies the
 * same rule rather than re-deciding it.
 */
export function safeErrorMessage(body: BubbleErrorBody | null | undefined): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  if (body.error_class) return undefined;
  const flat = body.body ?? body;
  return flat?.message
    ? (flat.status ? `${flat.status}: ${flat.message}` : flat.message)
    : undefined;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const parsed = JSON.parse(text) as BubbleErrorBody;
      if (parsed?.error_class) return `Bubble rejected the request (${parsed.error_class})`;
      const message = safeErrorMessage(parsed);
      if (message) return message;
    } catch {
      // Not JSON — e.g. an API Workflow returning plain text. Use it verbatim.
      return text.slice(0, 500);
    }
  }
  return res.statusText || `HTTP ${res.status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  /** JSON body. Sent as `application/json`; omit for a bodyless request. */
  json?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one connection's Data/Workflow API
 * root. Never sets Authorization — the runtime routes every request through
 * the auth `sign` hook.
 */
export class BubbleClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  /** Build `{base}/api/1.1{path}`, with `query` appended as a query string. */
  private url(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${this.base}/api/1.1${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  /** A request against the Data API (`/obj/...`) or Workflow API (`/wf/...`). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      throw new Error(
        `Bubble ${res.status} for ${init.method} ${url.pathname}: ${await readErrorMessage(res)}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Workflow API responses can be plain text or a redirect target's body.
      return text as unknown as T;
    }
  }

  /**
   * Bulk create's body is `text/plain`, one JSON object per line — NOT a JSON
   * array. This is the one Data API request that is not `application/json`.
   */
  async requestBulk(
    path: string,
    lines: string,
  ): Promise<Array<{ status: string; id?: string; message?: string }>> {
    const url = this.url(path);
    const res = await this.ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "text/plain", accept: "text/plain" },
      body: lines,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Bubble ${res.status} for POST ${url.pathname}: ${text || res.statusText}`);
    }
    return text.split("\n").filter((line) => line.trim().length > 0).map((line) => {
      try {
        return JSON.parse(line) as { status: string; id?: string; message?: string };
      } catch {
        return { status: "error", message: `could not parse response line: ${line}` };
      }
    });
  }
}
