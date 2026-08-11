/**
 * Microsoft Graph client for the OneDrive drive/driveItem API — the whole
 * vendor surface this App talks to.
 *
 * Everything here was checked against the Microsoft Graph v1.0 reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/onedrive
 *
 * Four OneDrive-specific things this file exists to absorb:
 *
 *  1. **Addressing.** A driveItem is reachable through two documented forms and
 *     one root shorthand, and they compose with a *drive* prefix that is either
 *     the signed-in user's drive or a drive id:
 *
 *         /me/drive/items/{item-id}{suffix}
 *         /me/drive/root:/{item-path}:{suffix}      (the `:` are structural)
 *         /me/drive/root{suffix}                    (the drive's root folder)
 *         /drives/{drive-id}/…                      (any of the above)
 *
 *     Every action routes through `itemPath()` so that decision is made once.
 *     The path form is encoded segment-by-segment; the `:` delimiters are
 *     structure, not data, and are never encoded.
 *
 *  2. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never as a bare array, and the continuation cursor is `@odata.nextLink` —
 *     an *absolute URL* that already carries every query parameter from the
 *     original request. Graph's own guidance is to replay that URL verbatim
 *     rather than rebuild it (https://learn.microsoft.com/en-us/graph/paging).
 *     `delta` adds a second cursor, `@odata.deltaLink`, which appears *instead
 *     of* `@odata.nextLink` on the last page of a round.
 *
 *  3. **Empty and redirecting successful responses.** `204 No Content` for
 *     deletes, and `202 Accepted` + a `Location:` header for the asynchronous
 *     copy. Calling `res.json()` on either throws, so they route through
 *     `status()` / `accepted()` instead of `request()`.
 *
 *  4. **Request bodies cross the sandbox boundary as text.** The runtime's
 *     worker bridge stringifies `init.body` before handing it to the host
 *     (`core/packages/runtime/src/sandbox/worker.ts`), so a raw upload carries
 *     UTF-8 text and nothing else. `text()` is the one entry point that sends a
 *     non-JSON body, and it is deliberately typed `string`.
 *
 * Note there is no `Authorization` header anywhere in this file: the runtime
 * routes every request through the Auth `sign` hook, which is the only code
 * handed the credential.
 */
import type { HookContext } from "@w6w/types";

/** Graph's stable production endpoint. `beta` is deliberately not used. */
export const API_URL = "https://graph.microsoft.com/v1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query parameters. OData names (`$select`, `$top`, …) are passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** JSON object → JSON-encoded body. `undefined` → no body at all. */
  body?: unknown;
  /** Extra request headers (e.g. `if-match`, `prefer`). */
  headers?: Record<string, string>;
}

/** The shape of every Graph collection response. */
export interface GraphList<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
  "@odata.count"?: number;
}

/** What the list actions return: one or more pages, plus the cursor to continue. */
export interface PagedResult<T> {
  value: T[];
  /**
   * Present when Graph has more results. Feed it back as the `nextLink` param
   * on the next call — it is a complete URL, not an opaque token.
   */
  nextLink?: string;
  /**
   * Present on the final page of a `delta` round only. Store it and pass it as
   * `deltaLink` next time to get just what changed since.
   */
  deltaLink?: string;
  /** How many HTTP requests were actually made. */
  pages: number;
}

/** Graph's error envelope: `{ "error": { "code": "...", "message": "..." } }`. */
interface GraphError {
  error?: { code?: string; message?: string };
}

// ---------------------------------------------------------------- addressing --

/**
 * How the caller pointed at a drive and an item inside it.
 *
 * `itemId` and `itemPath` are the two documented forms and are mutually
 * exclusive; supplying both is a caller error rather than a silent preference,
 * because the two can disagree and quietly operating on the wrong file is the
 * worst outcome available. Supplying neither means the drive's root folder,
 * which is meaningful for `children` / `search` / `delta` and meaningless for
 * `delete` — hence `requireItemPath()`.
 */
export interface ItemRef {
  /** Drive id. Empty → the signed-in user's own drive (`/me/drive`). */
  driveId?: string;
  /** driveItem id, e.g. `01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN`. */
  itemId?: string;
  /** Path relative to the drive root, e.g. `Reports/Q3.pdf`. */
  itemPath?: string;
}

/**
 * `/me/drive` or `/drives/{drive-id}`.
 *
 * Both are documented roots for every call in this App. `/me/drive` is the one
 * a personal Microsoft account can use; a drive id addresses OneDrive for
 * Business drives, SharePoint document libraries and other users' drives, and
 * needs the broader `Files.ReadWrite.All` consent to match.
 * https://learn.microsoft.com/en-us/graph/api/drive-get
 */
export function drivePath(driveId?: string): string {
  const id = driveId?.trim();
  return id ? `/drives/${encodeURIComponent(id)}` : "/me/drive";
}

/**
 * Percent-encode a drive-relative file path **per segment**.
 *
 * `encodeURIComponent` on the whole string would eat the `/` separators; the
 * `:` delimiters that bracket the path in the addressing form are structural
 * and are added by `itemPath()`, never encoded.
 */
export function encodeItemPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

/**
 * Build the request path for an item (or the drive root), plus a relationship
 * suffix such as `/children`, `/content`, `/permissions`, `/copy`.
 *
 * The trailing-colon rule is the trap this function exists to hide: the
 * path-addressed form is `…/root:/{path}:` **when something follows** and
 * `…/root:/{path}` when nothing does. Graph rejects the dangling colon.
 */
export function itemPath(ref: ItemRef, suffix = ""): string {
  const drive = drivePath(ref.driveId);
  const id = ref.itemId?.trim();
  const path = ref.itemPath?.trim();

  if (id && path) {
    throw new Error(
      "Address the item by Item ID or by Item path, not both — they can point at different files.",
    );
  }
  if (id) return `${drive}/items/${encodeURIComponent(id)}${suffix}`;
  if (path) {
    const encoded = encodeItemPath(path);
    if (!encoded) throw new Error("Item path is empty after trimming its separators.");
    return suffix ? `${drive}/root:/${encoded}:${suffix}` : `${drive}/root:/${encoded}`;
  }
  return `${drive}/root${suffix}`;
}

/**
 * As `itemPath()`, but for the calls where "the root folder" is not a sensible
 * default — deleting, renaming, copying, sharing. A legible error beats a
 * request that silently addresses the whole drive.
 */
export function requireItemPath(ref: ItemRef, suffix = ""): string {
  if (!ref.itemId?.trim() && !ref.itemPath?.trim()) {
    throw new Error(
      "An item must be addressed: set either Item ID or Item path (e.g. `Reports/Q3.pdf`).",
    );
  }
  return itemPath(ref, suffix);
}

/**
 * The path of a **new** child named `fileName` inside the addressed parent
 * folder — the third documented addressing form, and the only one that mixes
 * the two others:
 *
 *     /me/drive/items/{parent-id}:/{filename}:/content
 *     /me/drive/root:/{parent-path}/{filename}:/content
 *     /me/drive/root:/{filename}:/content          (parent = the drive root)
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
 *
 * A `/` in `fileName` is rejected rather than encoded: it would silently create
 * the file somewhere other than the folder the caller addressed.
 */
export function childPath(ref: ItemRef, fileName: string, suffix = ""): string {
  const name = (fileName ?? "").trim();
  if (!name) throw new Error("File name is empty.");
  if (name.includes("/")) {
    throw new Error(
      "File name must not contain `/` — address the containing folder with Item path instead.",
    );
  }
  const drive = drivePath(ref.driveId);
  const id = ref.itemId?.trim();
  const path = ref.itemPath?.trim();
  if (id && path) {
    throw new Error(
      "Address the parent folder by Item ID or by Item path, not both — they can point at different folders.",
    );
  }
  if (id) {
    return `${drive}/items/${encodeURIComponent(id)}:/${encodeURIComponent(name)}:${suffix}`;
  }
  const encoded = path
    ? `${encodeItemPath(path)}/${encodeURIComponent(name)}`
    : encodeURIComponent(name);
  return `${drive}/root:/${encoded}:${suffix}`;
}

/** Escape a string for an OData function parameter: a literal `'` is doubled. */
export function odataString(value: string): string {
  return value.replaceAll("'", "''");
}

// -------------------------------------------------------------------- client --

/** Thin wrapper over `ctx.fetch`. */
export class GraphClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL. A path already starting with `http` is used as-is
   * (that is how `@odata.nextLink` and `@odata.deltaLink` are replayed). */
  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  private async fire(path: string, options: RequestOptions): Promise<Response> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    if (!res.ok) throw new Error(await describeFailure(res, method, url));
    return res;
  }

  /** Perform a request and decode the JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.fire(path, options);
    // 202/204 carry no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 202 || res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Send a raw text body — the simple upload, and the only call in this App
   * that is not JSON.
   *
   * `contentType` is a real parameter rather than a constant because Graph
   * stores whatever is sent and serves it back with that type; the reference's
   * `text/plain` is its example, not a fixed requirement.
   * https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
   */
  async text<T = unknown>(
    path: string,
    content: string,
    contentType = "text/plain",
    options: Omit<RequestOptions, "body"> = {},
  ): Promise<T> {
    const url = this.url(path, options.query);
    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "PUT",
      headers: { ...(options.headers ?? {}), "content-type": contentType },
      body: content,
    });
    if (!res.ok) throw new Error(await describeFailure(res, options.method ?? "PUT", url));
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Perform a request whose only meaningful result is "the service accepted
   * it" — Graph's `204 No Content` endpoints (delete item, delete permission).
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /**
   * Perform a request answered with `202 Accepted` + a `Location` header — in
   * this App, only `copy`.
   *
   * The monitor URL is *returned, never followed*: it lives on the tenant's own
   * SharePoint host (`contoso.sharepoint.com/_api/v2.0/monitor/…`), which is
   * per-tenant and therefore not enumerable in `w6w.network.allow`. Following
   * it would need a wildcard egress rule for a progress poll.
   * https://learn.microsoft.com/en-us/graph/api/driveitem-copy
   */
  async accepted(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; monitorUrl?: string }> {
    const res = await this.fire(path, options);
    return { status: res.status, monitorUrl: res.headers.get("location") ?? undefined };
  }

  /** Fetch exactly one page of a collection. */
  async page<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const body = await this.request<GraphList<T>>(path, options);
    return {
      value: body?.value ?? [],
      nextLink: body?.["@odata.nextLink"],
      deltaLink: body?.["@odata.deltaLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests.
   *
   * Bounded on purpose: a drive is unbounded, an action's runtime is not, and a
   * silent infinite walk is the failure mode this replaces. When the cap is hit
   * the surviving `nextLink` is returned so the caller can resume.
   */
  async collect<T>(
    path: string,
    options: RequestOptions = {},
    maxPages = 10,
  ): Promise<PagedResult<T>> {
    const limit = Math.max(1, Math.floor(maxPages));
    const value: T[] = [];
    let cursor: string | undefined;
    let deltaLink: string | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      value.push(...(body?.value ?? []));
      deltaLink = body?.["@odata.deltaLink"] ?? deltaLink;
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, nextLink: cursor, deltaLink, pages };
  }
}

/** Surface Graph's `error.code` / `error.message` when it sends one. */
async function describeFailure(res: Response, method: string, url: URL): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as GraphError;
      const code = parsed.error?.code;
      const message = parsed.error?.message;
      detail = [code, message].filter(Boolean).join(": ") || text;
    } catch {
      detail = text;
    }
  } catch { /* body already consumed or unreadable */ }
  return `Microsoft Graph ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`;
}

// ------------------------------------------------------------------ helpers --

/** Join a repeated param into the comma-separated form OData expects. */
export function odataList(values?: string[]): string | undefined {
  const joined = (values ?? []).map((v) => (v ?? "").trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/** Drop `undefined` entries so a PATCH only ever touches what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
