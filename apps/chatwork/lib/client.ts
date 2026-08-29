import type { HookContext } from "@w6w/types";

/**
 * Chatwork API v2 REST client (`api.chatwork.com/v2`).
 *
 * Every path, verb, parameter and response field in this app was read out of
 * Chatwork's own OpenAPI 3.1 document, embedded server-side in
 * `developer.chatwork.com`'s reference pages (fetched 2026-08-29, `info.version`
 * `v2`, license note pointing at `github.com/chatwork/chatwork-api-spec`), plus
 * a live unauthenticated probe against `api.chatwork.com`. Nothing here came
 * from a third-party integration directory.
 *
 * ## One host, one auth header
 *
 * The document declares exactly one server, `https://api.chatwork.com/v2`.
 * There is no regional host and no sandbox environment. The vendor's
 * `securitySchemes.chatwork_token` names the header `x-chatworktoken`; HTTP
 * header names are case-insensitive, and Chatwork's own docs display it as
 * `X-ChatWorkToken`, so this app sends that exact casing (see `auth/api-token.ts`).
 * OAuth2 is documented too, but every third-party "personal API token"
 * integration Chatwork itself describes uses the plain header, and that is all
 * this app implements — see `auth/api-token.ts` for why.
 *
 * ## Two request bodies, not one
 *
 * Every `POST`/`PUT` body in the spec is `application/x-www-form-urlencoded`
 * **except** the one endpoint that uploads a file
 * (`POST /rooms/{room_id}/files`), which is `multipart/form-data`. Mixing them
 * up is the single most common way an integration against this API breaks —
 * a JSON body is accepted by *nothing* here, which is unusual enough among
 * chat-platform APIs to be worth stating plainly.
 *
 * ## Empty lists answer `204`, not `200 []`
 *
 * Five list endpoints (`GET /my/tasks`, `/contacts`, `/rooms/{id}/tasks`,
 * `/rooms/{id}/files`, `/incoming_requests`) document a `204 No Content` —
 * with no body at all — for the empty case, instead of `200` with an empty
 * JSON array. {@link ChatworkClient.list} normalises that to `[]` so every
 * list action can treat "no results" as one shape rather than two.
 *
 * ## Errors
 *
 * Every failure is `{"errors": ["…", …]}` with a 4xx/5xx status — confirmed
 * live: an unauthenticated `GET /me` and a syntactically-plausible bogus token
 * both answer `401 {"errors":["Invalid API Token"]}`. The vendor's message text
 * does not distinguish "no token reached the API" from "the token is wrong",
 * so {@link formatChatworkError} surfaces the vendor's own strings verbatim
 * rather than inventing a distinction the API itself does not make.
 *
 * ## Rate limits
 *
 * Every successful (2xx) response carries `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix seconds) — confirmed
 * against the spec's header components. They are **absent from error
 * responses**, confirmed live against the 401 above. See `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.chatwork.com/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Form-encoded body — every documented POST/PUT except the file upload. */
  form?: Record<string, QueryValue>;
  /** Pre-built body plus its own content-type, for the multipart file upload. */
  rawBody?: { contentType: string; text: string };
  accept?: string;
}

export interface ChatworkErrorBody {
  errors?: string[];
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact(obj: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
  }
  return out;
}

/**
 * Render an "is this on" flag the way Chatwork's boolean-as-integer params
 * read: `1` for on, and *absence* for off — the vendor never documents how a
 * literal `0` is parsed for these, only that omitting the parameter is the
 * documented default.
 */
export function flag(v: boolean | undefined): string | undefined {
  return v === true ? "1" : undefined;
}

/** Turn Chatwork's `{"errors": [...]}` body into one readable line. */
export function formatChatworkError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ChatworkErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ChatworkErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const messages = parsed?.errors;
  if (!messages || messages.length === 0) {
    return `Chatwork ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  }
  const suffix = status === 429
    ? " — Chatwork rate-limits per token; retry after X-RateLimit-Reset"
    : "";
  return `Chatwork ${status} for ${method} ${path}: ${messages.join("; ")}${suffix}`;
}

export class ChatworkClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON body. Returns `undefined` for a `204 No Content`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list endpoint's body — normalising the documented `204` (no results) to
   * `[]`, so every list action returns one shape regardless of which of the
   * two the vendor chose for "nothing here".
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const res = await this.send(path, options);
    if (res.status === 204) return [];
    const text = await res.text();
    if (!text) return [];
    return JSON.parse(text) as T[];
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.rawBody) {
      headers["content-type"] = options.rawBody.contentType;
      init.body = options.rawBody.text;
    } else if (options.form) {
      const body = compact(options.form);
      if (Object.keys(body).length > 0) {
        headers["content-type"] = "application/x-www-form-urlencoded";
        init.body = new URLSearchParams(body).toString();
      }
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatChatworkError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
