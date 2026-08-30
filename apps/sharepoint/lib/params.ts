/**
 * Param fragments shared by the actions.
 *
 * Nearly every action addresses a site, most address a list or a document
 * library inside it, and the collections share one OData vocabulary, so
 * declaring those fields once keeps sixteen actions honest with each other.
 * Each helper returns a fresh array, so an action can splice in its own fields
 * without mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees
 * a concrete `Param[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * Which site. All three are optional and at most one addressing pair may be
 * used: `siteId` alone, or `hostname` (+ optional `path`). Leaving everything
 * empty means the tenant's default root site (`/sites/root`).
 *
 * Not marked `required` for the same reason `itemId`/`itemPath` aren't on the
 * sibling `onedrive` App: "one or the other" is not a constraint a single
 * `required` flag can express, so the client raises a legible error instead.
 */
export function siteParams(): Param[] {
  return [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      placeholder: "contoso.sharepoint.com,2C712604-...,2D2244C3-...",
      hint:
        "The site's own compound `id` (from Get Site or List Subsites). Set this **or** Hostname, not both. Leave both empty for the tenant's default root site.",
    },
    {
      key: "hostname",
      label: "Hostname",
      type: "string",
      placeholder: "contoso.sharepoint.com",
      hint: "The SharePoint site collection's hostname. Set this **or** Site ID, not both.",
    },
    {
      key: "path",
      label: "Site path",
      type: "string",
      advanced: true,
      placeholder: "teams/hr",
      hint:
        "Server-relative path under Hostname, e.g. `teams/hr` for `https://contoso.sharepoint.com/teams/hr`. Only meaningful alongside Hostname; leave empty for that hostname's own root site.",
    },
  ];
}

/**
 * Which document library. Advanced because the overwhelmingly common answer
 * is "this site's default library", and reaching another one by id is a rarer
 * need — a different library on the same site, or one you already resolved
 * via List Drives.
 */
export const driveIdParam: Param = {
  key: "driveId",
  label: "Drive ID",
  type: "string",
  advanced: true,
  hint:
    "Leave empty to use the addressed site's default document library (`{site}/drive`). Set it to address a specific library directly as `/drives/{id}` — get one from List Drives. When set, Site ID / Hostname / Path are ignored.",
};

/** A list, addressed by its own `id` — the only form the reference documents. */
export const listIdParam: Param = {
  key: "listId",
  label: "List ID",
  type: "string",
  required: true,
  placeholder: "5771e865-4e91-48b8-a0de-35a25d4e52fe",
  hint: "The list's `id` (GUID) — from List Lists. There is no path-based form for a list.",
};

/**
 * The two documented ways to point at a driveItem. At most one may be set.
 * Mirrors the sibling `onedrive` App's `itemParams()` exactly, since the
 * driveItem resource — and its addressing rules — are the same one.
 */
export function itemParams(opts: { rootMeans?: string } = {}): Param[] {
  const rootNote = opts.rootMeans ? ` Leave both empty for ${opts.rootMeans}.` : "";
  return [
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      placeholder: "01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN",
      hint:
        `driveItem id — \`{drive}/items/{id}\`. Survives a rename or a move. Set this **or** Item path, not both.${rootNote}`,
    },
    {
      key: "itemPath",
      label: "Item path",
      type: "string",
      placeholder: "Reports/Q3.pdf",
      hint:
        `Path relative to the library root — \`{drive}/root:/{path}\`. Readable, but breaks the moment the file moves. Set this **or** Item ID, not both.${rootNote}`,
    },
  ];
}

/**
 * `$select` and `$expand` — supported on the site, list and driveItem
 * collections in this App.
 */
export function selectParams(expandHint: string): Param[] {
  return [
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select` — return only these properties.",
    },
    {
      key: "expand",
      label: "Expand relationships",
      type: "string",
      repeat: true,
      advanced: true,
      hint: expandHint,
    },
  ];
}

/**
 * `$top` and the `@odata.nextLink` continuation controls, shared by every
 * paged collection in this App.
 *
 * `nextLink` is an absolute URL rather than an opaque token: Graph's paging
 * guidance is to replay the returned link verbatim, never to rebuild it.
 */
export function pagingParams(opts: { defaultTop?: number } = {}): Param[] {
  return [
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: opts.defaultTop ?? 50,
      validation: { integer: true, min: 1, max: 999 },
      hint: "OData `$top` — results per request.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `@odata.nextLink` URL from a previous run. Continues where that run stopped; other query params are ignored because the link already carries them.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ];
}

/** `@microsoft.graph.conflictBehavior` — travels in the JSON body for both
 * endpoints this App uses it on (Create Folder, Upload File), per each
 * endpoint's own reference example. */
export function conflictBehaviorParam(hint: string): Param {
  return {
    key: "conflictBehavior",
    label: "If the name is taken",
    type: "select",
    options: [
      { value: "fail", label: "Fail (Graph's default)" },
      { value: "rename", label: "Rename — append a number" },
      { value: "replace", label: "Replace the existing item" },
    ],
    hint,
  };
}

/** `if-match`, the optimistic-concurrency guard Graph offers on list item writes. */
export const ifMatchParam: Param = {
  key: "ifMatch",
  label: "Only if eTag matches",
  type: "string",
  advanced: true,
  hint:
    "Sent as the `if-match` header. Graph answers `412 Precondition Failed` and changes nothing when the item's current eTag differs — the cheap way to avoid clobbering a concurrent edit.",
};

/**
 * A listItem's column values — the `fields` facet.
 *
 * Every SharePoint list has different columns, so this is a caller-supplied
 * JSON object keyed by internal column name (e.g. `Title`, `Author`), exactly
 * as the reference's own request bodies show — never a fixed param list.
 */
export function fieldsParam(hint: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "json",
    required: true,
    hint,
  };
}

/** The `value`-shaped output every list action returns. */
export const listOutput = [
  { key: "value", type: "array" as const, label: "Items" },
  { key: "nextLink", type: "string" as const, label: "Next link" },
  { key: "pages", type: "number" as const, label: "Pages fetched" },
];

/** The site properties worth surfacing by default. */
export const siteOutput = [
  { key: "id", type: "string" as const, label: "Site ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "webUrl", type: "string" as const, label: "Web URL" },
  { key: "createdDateTime", type: "string" as const, label: "Created" },
];

/** The list properties worth surfacing by default. */
export const listMetaOutput = [
  { key: "id", type: "string" as const, label: "List ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "webUrl", type: "string" as const, label: "Web URL" },
  { key: "list", type: "object" as const, label: "List info (template, hidden)" },
];

/** The listItem fields worth surfacing by default on a single-item result. */
export const listItemOutput = [
  { key: "id", type: "string" as const, label: "Item ID" },
  { key: "eTag", type: "string" as const, label: "eTag" },
  { key: "webUrl", type: "string" as const, label: "Web URL" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "fields", type: "object" as const, label: "Column values" },
];

/** The driveItem fields worth surfacing by default on a single-item result. */
export const itemOutput = [
  { key: "id", type: "string" as const, label: "Item ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "size", type: "number" as const, label: "Size (bytes)" },
  { key: "webUrl", type: "string" as const, label: "Web URL" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "parentReference", type: "object" as const, label: "Parent reference" },
];
