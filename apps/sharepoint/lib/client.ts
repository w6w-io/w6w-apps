/**
 * Microsoft Graph client for the SharePoint sites/lists/drives API — the whole
 * vendor surface this App talks to.
 *
 * Everything here was checked against the Microsoft Graph v1.0 reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/sharepoint
 *
 * That overview names three resource types this App exposes — `site`, `list`,
 * `listItem` — plus the `drive`/`driveItem` surface a site's document libraries
 * share with OneDrive. Four things this file exists to absorb:
 *
 *  1. **Three ways to address a site**, and they compose:
 *
 *         /sites/root                              the tenant's default site
 *         /sites/{site-id}                          by opaque compound ID
 *         /sites/{hostname}                         root site at that hostname
 *         /sites/{hostname}:/{server-relative-path}  by path (the `:` is structural)
 *
 *     A site ID is itself a comma-joined compound
 *     (`{hostname},{spSiteId},{spWebId}`) — it travels as a single opaque path
 *     segment, never split on its commas. Every action routes through
 *     `sitePath()` so the decision is made once.
 *
 *  2. **A list is addressed by ID only.** Unlike a driveItem or a site, the
 *     reference documents no path-based form for `/sites/{id}/lists/{list-id}` —
 *     only the list's own `id` (a GUID). `listPath()` and `listItemPath()` are
 *     thin joins on top of `sitePath()`.
 *
 *  3. **A site's document library is a `drive`,** reachable at
 *     `/sites/{site-id}/drive` (the default library) or, for another library on
 *     the same or a different site, `/drives/{drive-id}` directly — the id a
 *     Get Drive / List Drives call returns. Once resolved to a drive, driveItem
 *     addressing is identical to OneDrive's: an item id, a root-relative path
 *     with structural `:` delimiters, or neither for the drive root.
 *
 *  4. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never a bare array, and the continuation cursor is `@odata.nextLink` — an
 *     *absolute URL* that already carries every query parameter from the
 *     original request. Graph's own guidance is to replay that URL verbatim
 *     rather than rebuild it (https://learn.microsoft.com/en-us/graph/paging).
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
  /** How many HTTP requests were actually made. */
  pages: number;
}

/** Graph's error envelope: `{ "error": { "code": "...", "message": "..." } }`. */
interface GraphError {
  error?: { code?: string; message?: string };
}

// ---------------------------------------------------------------- addressing --

/**
 * How the caller pointed at a site.
 *
 * `siteId` and `hostname` are mutually exclusive — supplying both is a caller
 * error rather than a silent preference, because the two can disagree and
 * quietly operating on the wrong site is the worst outcome available. `path`
 * is only meaningful alongside `hostname` (the reference has no bare
 * `/sites/{path}` form). Supplying none of the three means the tenant's
 * default root site.
 */
export interface SiteRef {
  /** Opaque compound site ID, e.g. `contoso.sharepoint.com,2C71...,2D22...`. */
  siteId?: string;
  /** SharePoint hostname, e.g. `contoso.sharepoint.com`. */
  hostname?: string;
  /** Server-relative path under `hostname`, e.g. `teams/hr`. */
  path?: string;
}

/**
 * Percent-encode a relative path **per segment**.
 *
 * `encodeURIComponent` on the whole string would eat the `/` separators; the
 * `:` delimiters that bracket a path in the addressing form are structural and
 * are added by the caller, never encoded here.
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
 * `/sites/root`, `/sites/{site-id}`, `/sites/{hostname}` or
 * `/sites/{hostname}:/{path}`.
 * https://learn.microsoft.com/en-us/graph/api/site-get
 * https://learn.microsoft.com/en-us/graph/api/site-getbypath
 */
export function sitePath(ref: SiteRef = {}): string {
  const siteId = ref.siteId?.trim();
  const hostname = ref.hostname?.trim();
  const path = ref.path?.trim();

  if (siteId && hostname) {
    throw new Error(
      "Address the site by Site ID or by Hostname, not both — they can point at different sites.",
    );
  }
  if (path && !hostname) {
    throw new Error("Site path needs a Hostname to be relative to.");
  }
  // The compound site ID is one opaque path segment; its internal commas are
  // never split or re-encoded beyond the single encodeURIComponent pass.
  if (siteId) return `/sites/${encodeURIComponent(siteId)}`;
  if (hostname) {
    const encoded = path ? encodeItemPath(path) : "";
    return encoded
      ? `/sites/${encodeURIComponent(hostname)}:/${encoded}`
      : `/sites/${encodeURIComponent(hostname)}`;
  }
  return "/sites/root";
}

/**
 * How the caller pointed at a drive (document library): a site's default
 * library, or a specific library addressed by the drive id a Get Drive / List
 * Drives call returned.
 */
export interface DriveRef extends SiteRef {
  /** A document library's own drive id — addresses it directly, bypassing the site. */
  driveId?: string;
}

/** `/drives/{drive-id}` or `{sitePath}/drive`. https://learn.microsoft.com/en-us/graph/api/drive-get */
export function drivePath(ref: DriveRef = {}): string {
  const driveId = ref.driveId?.trim();
  if (driveId) return `/drives/${encodeURIComponent(driveId)}`;
  return `${sitePath(ref)}/drive`;
}

/**
 * How the caller pointed at a driveItem (or the drive root) inside the
 * resolved drive, plus a relationship suffix such as `/children`, `/content`.
 *
 * The trailing-colon rule is the trap this function exists to hide: the
 * path-addressed form is `…/root:/{path}:` **when something follows** and
 * `…/root:/{path}` when nothing does. Graph rejects the dangling colon.
 */
export interface ItemRef extends DriveRef {
  /** driveItem id, e.g. `01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN`. */
  itemId?: string;
  /** Path relative to the drive root, e.g. `Reports/Q3.pdf`. */
  itemPath?: string;
}

export function itemPath(ref: ItemRef, suffix = ""): string {
  const drive = drivePath(ref);
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
 * As `itemPath()`, but for calls where "the library's root folder" is not a
 * sensible default — reading a specific file's download URL. A legible error
 * beats a request that silently addresses the whole library.
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
 * folder — the third documented addressing form, mixing the other two:
 *
 *     /drives/{drive-id}/items/{parent-id}:/{filename}:/content
 *     {sitePath}/drive/root:/{parent-path}/{filename}:/content
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
 *
 * A `/` in `fileName` is rejected rather than encoded: it would silently
 * create the file somewhere other than the folder the caller addressed.
 */
export function childPath(ref: ItemRef, fileName: string, suffix = ""): string {
  const name = (fileName ?? "").trim();
  if (!name) throw new Error("File name is empty.");
  if (name.includes("/")) {
    throw new Error(
      "File name must not contain `/` — address the containing folder with Item path instead.",
    );
  }
  const drive = drivePath(ref);
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

/**
 * A list is addressed by ID only — the reference documents no path-based
 * form, unlike a site or a driveItem.
 * https://learn.microsoft.com/en-us/graph/api/list-get
 */
export interface ListRef extends SiteRef {
  listId: string;
}

export function listPath(ref: ListRef, suffix = ""): string {
  const listId = ref.listId?.trim();
  if (!listId) throw new Error("List ID is required.");
  return `${sitePath(ref)}/lists/${encodeURIComponent(listId)}${suffix}`;
}

/** A listItem is addressed by its own ID (integer or GUID), inside a list. */
export interface ListItemRef extends ListRef {
  itemId: string;
}

export function listItemPath(ref: ListItemRef, suffix = ""): string {
  const itemId = ref.itemId?.trim();
  if (!itemId) throw new Error("Item ID is required.");
  return `${listPath(ref)}/items/${encodeURIComponent(itemId)}${suffix}`;
}

// -------------------------------------------------------------------- client --

/** Thin wrapper over `ctx.fetch`. */
export class GraphClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL. A path already starting with `http` is used as-is
   * (that is how `@odata.nextLink` is replayed). */
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
    // 204 carries no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 204) return undefined as T;
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
   * it" — Graph's `204 No Content` endpoints (delete a list item).
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /** Fetch exactly one page of a collection. */
  async page<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const body = await this.request<GraphList<T>>(path, options);
    return {
      value: body?.value ?? [],
      nextLink: body?.["@odata.nextLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests.
   *
   * Bounded on purpose: a list or a library is unbounded, an action's runtime
   * is not, and a silent infinite walk is the failure mode this replaces. When
   * the cap is hit the surviving `nextLink` is returned so the caller can
   * resume.
   */
  async collect<T>(
    path: string,
    options: RequestOptions = {},
    maxPages = 10,
  ): Promise<PagedResult<T>> {
    const limit = Math.max(1, Math.floor(maxPages));
    const value: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      value.push(...(body?.value ?? []));
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, nextLink: cursor, pages };
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
