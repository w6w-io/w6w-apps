/**
 * Microsoft Graph client for the OneNote API — the whole vendor surface this
 * App talks to.
 *
 * Everything here was checked against the Microsoft Graph v1.0 reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/onenote-api-overview
 * https://learn.microsoft.com/en-us/graph/api/resources/onenote
 *
 * Four things this file exists to absorb:
 *
 *  1. **Four "locations", one shape.** Every OneNote call is rooted at
 *     `{version}/{location}/onenote/...`, and the reference documents exactly
 *     four forms for `{location}`:
 *
 *         /me                                the signed-in user
 *         /users/{id | userPrincipalName}    another user who shared with the caller
 *         /groups/{id}                       a Microsoft 365 group's notebooks
 *         /sites/{id}                        a SharePoint site's notebooks
 *
 *     Unlike the sibling `sharepoint` App's site addressing, a site here takes
 *     only the opaque `id` form — the reference's OneNote HTTP request lines
 *     never show a hostname/path alternative. `onenoteBase()` is the one place
 *     this decision is made.
 *
 *  2. **Three containers nest arbitrarily; addressing them is uniform.** A
 *     `notebook` holds `sections` and `sectionGroups`; a `sectionGroup` holds
 *     more `sections` and `sectionGroups`; a `section` holds `pages`. Every one
 *     of those collections is also reachable FLAT — `GET /onenote/sections`
 *     returns every section under the location regardless of which notebook
 *     owns it — which is what a location-only call (no container id) means
 *     below. `containerBase()` picks between "under this notebook", "under
 *     this section group" and "flat" from whichever id the caller supplied,
 *     and refuses both at once: they can name different parents, and silently
 *     preferring one is worse than asking.
 *
 *  3. **A notebook is read-only past creation.** The `notebook` resource's own
 *     Methods table lists Get / Get recent / Get from web / Create section(s) /
 *     List section(s) / Copy — no update, no delete. Likewise `onenoteSection`
 *     and `sectionGroup` document no update or delete of their own metadata.
 *     Only a `page` supports both (`PATCH .../content`, `DELETE`), so this App
 *     offers no update/delete action for the other three resources — leaving
 *     one out because the reference does not document it, not because it was
 *     missed.
 *
 *  4. **A page's content is HTML, not JSON — both ways.** `GET
 *     .../pages/{id}/content` answers `text/html`, and `POST .../pages` (or
 *     `.../sections/{id}/pages`) expects the request body to itself BE the
 *     page's HTML (`Content-Type: text/html`), not a JSON envelope wrapping it.
 *     The page's own JSON resource (`GET .../pages/{id}`) is metadata only —
 *     title, timestamps, links — and carries no `content` field despite the
 *     `onenotePage` resource type listing one; the reference's own examples
 *     read content from the separate `/content` endpoint. `html()` and
 *     `postHtml()` exist because `request()`'s `res.json()` would silently
 *     return `undefined` for either of these.
 *
 * The multipart form (attaching binary image/file resources alongside the
 * HTML) is documented but not offered here: a w6w Action runs in a sandboxed
 * worker whose `ctx.fetch` body is carried to the host as text
 * (`core/packages/runtime/src/sandbox/worker.ts`), so bytes above U+007F do
 * not survive the crossing intact — the same limitation the sibling
 * `sharepoint` App's `upload-file` action documents for the same reason. This
 * App's Create/Update Page actions accept HTML text only.
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
  /** Extra request headers (e.g. `prefer`). */
  headers?: Record<string, string>;
}

/** The shape of every Graph collection response. */
export interface GraphList<T> {
  value: T[];
  "@odata.nextLink"?: string;
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

export type OnenoteLocation = "me" | "user" | "group" | "site";

/**
 * Which of the four documented `{location}` forms to address.
 *
 * `location` is typed as a plain `string` rather than the `OnenoteLocation`
 * union: it round-trips through an Action's `select`-type param, whose
 * runtime value is whatever a caller (or the editor) hands over — a `Param`
 * has no way to narrow a JSON string to a literal union at the type level.
 * `onenoteBase()` below is where an unrecognised value is actually rejected.
 */
export interface LocationRef {
  location?: string;
  /**
   * Required for every location except `me`: a user id or userPrincipalName,
   * a group id, or a SharePoint site id, matching whichever `location` is set.
   */
  locationId?: string;
}

/** `/me/onenote`, `/users/{id}/onenote`, `/groups/{id}/onenote` or `/sites/{id}/onenote`. */
export function onenoteBase(ref: LocationRef = {}): string {
  const location = ref.location ?? "me";
  const id = ref.locationId?.trim();
  switch (location) {
    case "me":
      return "/me/onenote";
    case "user":
      if (!id) {
        throw new Error(
          'Location ID is required for location "user" — the target user\'s id or userPrincipalName.',
        );
      }
      return `/users/${encodeURIComponent(id)}/onenote`;
    case "group":
      if (!id) throw new Error('Location ID is required for location "group" — the group\'s id.');
      return `/groups/${encodeURIComponent(id)}/onenote`;
    case "site":
      if (!id) {
        throw new Error('Location ID is required for location "site" — the SharePoint site\'s id.');
      }
      return `/sites/${encodeURIComponent(id)}/onenote`;
    default:
      throw new Error(`Unknown location "${location}".`);
  }
}

export function notebooksPath(ref: LocationRef = {}): string {
  return `${onenoteBase(ref)}/notebooks`;
}

export function notebookPath(ref: LocationRef, id: string, suffix = ""): string {
  const trimmed = id?.trim();
  if (!trimmed) throw new Error("Notebook ID is required.");
  return `${onenoteBase(ref)}/notebooks/${encodeURIComponent(trimmed)}${suffix}`;
}

/** Which container a new section / section group is created in, or a flat list reads from. */
export interface ContainerRef extends LocationRef {
  /** Create/list under this notebook's own collection. */
  notebookId?: string;
  /** Create/list under this section group's own collection. */
  sectionGroupId?: string;
}

/**
 * `{base}/notebooks/{id}/{collection}`, `{base}/sectionGroups/{id}/{collection}`,
 * or the flat `{base}/{collection}` when neither container id is given.
 *
 * `notebookId` and `sectionGroupId` are mutually exclusive — they can name
 * different parents, and silently preferring one is worse than asking.
 */
export function containerBase(
  ref: ContainerRef,
  collection: "sections" | "sectionGroups",
): string {
  const notebookId = ref.notebookId?.trim();
  const sectionGroupId = ref.sectionGroupId?.trim();
  if (notebookId && sectionGroupId) {
    throw new Error(
      "Address the container by Notebook ID or by Section Group ID, not both — they can be different parents.",
    );
  }
  const base = onenoteBase(ref);
  if (notebookId) return `${base}/notebooks/${encodeURIComponent(notebookId)}/${collection}`;
  if (sectionGroupId) {
    return `${base}/sectionGroups/${encodeURIComponent(sectionGroupId)}/${collection}`;
  }
  return `${base}/${collection}`;
}

export function sectionPath(ref: LocationRef, id: string, suffix = ""): string {
  const trimmed = id?.trim();
  if (!trimmed) throw new Error("Section ID is required.");
  return `${onenoteBase(ref)}/sections/${encodeURIComponent(trimmed)}${suffix}`;
}

export function sectionGroupPath(ref: LocationRef, id: string, suffix = ""): string {
  const trimmed = id?.trim();
  if (!trimmed) throw new Error("Section group ID is required.");
  return `${onenoteBase(ref)}/sectionGroups/${encodeURIComponent(trimmed)}${suffix}`;
}

/**
 * `{base}/sections/{id}/pages` when `sectionId` is set, else the flat
 * `{base}/pages` — either a listing (every page under the location) or, for a
 * POST, "the default section of the default notebook" per the reference.
 */
export function pagesPath(ref: LocationRef & { sectionId?: string } = {}): string {
  const sectionId = ref.sectionId?.trim();
  const base = onenoteBase(ref);
  return sectionId ? `${base}/sections/${encodeURIComponent(sectionId)}/pages` : `${base}/pages`;
}

export function pagePath(ref: LocationRef, id: string, suffix = ""): string {
  const trimmed = id?.trim();
  if (!trimmed) throw new Error("Page ID is required.");
  return `${onenoteBase(ref)}/pages/${encodeURIComponent(trimmed)}${suffix}`;
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
   * Perform a request whose only meaningful result is "the service accepted
   * it" — Graph's `204 No Content` endpoints (update/delete a page).
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /**
   * Fetch a page's raw content: `GET .../pages/{id}/content`. Answers
   * `text/html`, never JSON — this exists because `request()` would silently
   * discard the body via a failed `res.json()`.
   * https://learn.microsoft.com/en-us/graph/api/page-get
   */
  async html(path: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.fire(path, options);
    return await res.text();
  }

  /**
   * POST a page's HTML content directly as the request body — Create Page's
   * documented non-multipart form. Response is the new `page` object (JSON).
   * https://learn.microsoft.com/en-us/graph/api/section-post-pages
   */
  async postHtml<T = unknown>(
    path: string,
    html: string,
    contentType = "text/html",
    options: Omit<RequestOptions, "body"> = {},
  ): Promise<T> {
    const url = this.url(path, options.query);
    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "POST",
      headers: { ...(options.headers ?? {}), "content-type": contentType },
      body: html,
    });
    if (!res.ok) throw new Error(await describeFailure(res, options.method ?? "POST", url));
    if (res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
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
   * Bounded on purpose: a pages collection is unbounded, an action's runtime
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
