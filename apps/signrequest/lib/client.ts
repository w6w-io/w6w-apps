/**
 * SignRequest REST API — `https://signrequest.com/api/v1/`.
 *
 * Every path, parameter and response field used by this app was read off SignRequest's own
 * machine-readable contract — `https://signrequest.com/api/v1/schema/swagger.json` (Swagger 2.0,
 * fetched 2026-09-05) — and cross-checked live against `signrequest.com` on the same date. Nothing
 * here is inferred from a naming pattern.
 *
 * ## One host — no per-team subdomain required
 *
 * SignRequest's docs mention a per-team browsable-API host
 * (`https://<your_subdomain>.signrequest.com/api/v1/`), which reads as though a Connection needs a
 * subdomain the way some multi-tenant vendors do. It doesn't: the swagger contract's own `host` is
 * the bare `signrequest.com`, and an API token authenticates against that host directly — verified
 * live 2026-09-05 (`GET https://signrequest.com/api/v1/documents/` with no token answers
 * `401 {"detail":"Authentication credentials were not provided."}`, i.e. it is a real, reachable
 * endpoint, not a redirect to a subdomain). The subdomain form is only a convenience for browsing
 * one team's endpoints in a logged-in browser tab.
 *
 * ## Auth
 *
 * `Authorization: Token YOUR_TOKEN_HERE` (note the scheme name is literally `Token`, not `Bearer`).
 * The token is created on the team's own "API settings" page inside the SignRequest UI — there is no
 * OAuth2 flow and no way to mint one from this app (`POST /api-tokens/` takes the account's own
 * email+password, a second credential shape this app never asks the user for — see `auth/api-key.ts`
 * and `README.md`).
 *
 * ## Errors
 *
 * A missing or invalid token answers `401` with a small DRF-shaped envelope:
 *
 * ```
 * GET /documents/ (no token)   -> 401 {"detail":"Authentication credentials were not provided."}
 * GET /documents/ (bad token)  -> 401 {"detail":"Invalid token"}
 * ```
 *
 * Verified live 2026-09-05. Validation errors on a `POST`/`PATCH` use Django REST Framework's other
 * standard shape instead — `{"<field>": ["<message>", ...]}` (a plain string per offending field,
 * not a `detail` key) — so this client checks for `detail` first and falls back to flattening
 * whatever fields DRF did report.
 *
 * ## Pagination — `page`, not `offset`
 *
 * Every list endpoint takes `page`/`limit` query params (**page number**, not `offset`+`limit` the
 * way most other DRF-built APIs in this pack paginate) and answers the standard DRF envelope:
 * `{"count": N, "next": "<url>|null", "previous": "<url>|null", "results": [...]}`.
 *
 * ## `document` / `template` fields are full resource URLs, not bare ids
 *
 * `SignRequest.document`, `Document.template` and `DocumentAttachment.document` are all declared
 * `type: string, format: uri` in the contract — e.g. sending a SignRequest expects
 * `"document": "https://signrequest.com/api/v1/documents/<uuid>/"`, not `"document": "<uuid>"`.
 * Every action in this app still takes a plain uuid as its param (consistent with the rest of this
 * pack) and this client builds the full resource URL before it goes on the wire — see
 * {@link resourceUrl}.
 *
 * ## No auth header here
 *
 * The runtime routes every `ctx.fetch` through the auth `sign` hook, which is the only code handed
 * the credential. This client never sets one.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://signrequest.com/api/v1";

/** Build the full resource URL SignRequest expects in a `document`/`template` reference field. */
export function resourceUrl(kind: "documents" | "templates", uuid: string): string {
  return `${API_BASE}/${kind}/${encodeURIComponent(uuid)}/`;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Omitted keys are never sent. */
  body?: unknown;
  headers?: Record<string, string>;
}

/** Drop `undefined` / `null` / `""` so an unset optional param is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/**
 * Parse a JSON-array param (signers, prefill tags, required attachments, …). Rejects anything that
 * is not an array so a typo fails here with the param's own name rather than as an opaque error
 * from SignRequest.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/** DRF's two error shapes: `{"detail": "..."}` (auth/permission) or `{"<field>": ["..."]}`. */
function messageFrom(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const obj = body as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  const parts: string[] = [];
  for (const [field, value] of Object.entries(obj)) {
    const msgs = Array.isArray(value) ? value.map(String) : [String(value)];
    parts.push(`${field}: ${msgs.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("; ") : fallback;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets an auth header — `sign` does that.
 */
export class SignRequestClient {
  constructor(private ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: unknown;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // Non-JSON error body — fall back to the raw text below.
        }
      }
      const label = messageFrom(parsed, text ? text.slice(0, 200) : res.statusText);
      throw new Error(`SignRequest ${res.status} for ${method} ${url.pathname}: ${label}`);
    }

    if (res.status === 204) {
      await res.body?.cancel();
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
