/**
 * Param fragments shared by the actions.
 *
 * Every action addresses a drive and (nearly) every one addresses an item, and
 * the collections share one OData vocabulary, so declaring those fields once
 * keeps eighteen actions honest with each other. Each helper returns a fresh
 * array, so an action can splice in its own fields without mutating a shared
 * object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * Which drive. Empty means the signed-in user's own OneDrive.
 *
 * Advanced because the overwhelmingly common answer is "mine", and because
 * reaching another drive needs a broader consent than reaching your own.
 */
export const driveIdParam: Param = {
  key: "driveId",
  label: "Drive ID",
  type: "string",
  advanced: true,
  hint:
    "Leave empty for the signed-in user's own OneDrive (`/me/drive`). Set it to address another drive — a colleague's OneDrive, or a SharePoint document library — as `/drives/{id}`. Needs the `Files.ReadWrite.All` consent this App requests.",
};

/**
 * The two documented ways to point at an item. At most one may be set.
 *
 * Neither is marked `required`, because "one or the other" is not a constraint a
 * single `required` flag can express; the client raises a legible error instead.
 * On the actions where leaving both empty means the drive root, the hints say so.
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
        `driveItem id — \`/drive/items/{id}\`. Survives a rename or a move. Set this **or** Item path, not both.${rootNote}`,
    },
    {
      key: "itemPath",
      label: "Item path",
      type: "string",
      placeholder: "Reports/Q3.pdf",
      hint:
        `Path relative to the drive root — \`/drive/root:/{path}\`. Readable, but breaks the moment the file moves. Set this **or** Item ID, not both.${rootNote}`,
    },
  ];
}

/**
 * `$select` and `$expand` — supported on every driveItem read in this App.
 *
 * `$filter` is deliberately absent: the children, search and delta references
 * each list the query options they support, and `$filter` is on none of them.
 */
export function selectParams(): Param[] {
  return [
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$select`, e.g. `id`, `name`, `size`, `webUrl`, `lastModifiedDateTime`. Returns only these properties — markedly cheaper on large folders.",
    },
    {
      key: "expand",
      label: "Expand relationships",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$expand`, e.g. `children`, `thumbnails`. Note `$expand=permissions` costs 5 resource units against the SharePoint throttling budget, against 2 for the folder listing itself.",
    },
  ];
}

/**
 * `$top`, `$orderby` and the `@odata.nextLink` continuation controls.
 *
 * `nextLink` is an absolute URL rather than an opaque token: Graph's paging
 * guidance is to replay the returned link verbatim, never to rebuild it.
 * There is no `$skip` here — the driveItem collections page with `$skipToken`
 * inside the returned link, and Graph does not document `$skip` for them.
 */
export function pagingParams(opts: { defaultTop?: number; orderbyHint?: string } = {}): Param[] {
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
      key: "orderby",
      label: "Order by",
      type: "string",
      advanced: true,
      hint: opts.orderbyHint ??
        "OData `$orderby`, e.g. `name asc`, `lastModifiedDateTime desc`. SharePoint-backed drives support fewer sort fields than personal OneDrive.",
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

/**
 * `@microsoft.graph.conflictBehavior`.
 *
 * The three values are the same everywhere; *where they travel* is not, which
 * is why this is a shared param and not a shared request builder. See the
 * README — the create-children reference puts the annotation in the JSON body,
 * the copy reference documents it as a query parameter, and the driveItem
 * resource page says it "should be included in the URL instead of the body".
 * Each action follows its own endpoint's page.
 */
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

/** `if-match`, the optimistic-concurrency guard Graph offers on writes. */
export const ifMatchParam: Param = {
  key: "ifMatch",
  label: "Only if eTag matches",
  type: "string",
  advanced: true,
  hint:
    "Sent as the `if-match` header. Graph answers `412 Precondition Failed` and changes nothing when the item's current eTag differs — the cheap way to avoid clobbering a concurrent edit.",
};

/** The `value`-shaped output every list action returns. */
export const listOutput = [
  { key: "value", type: "array" as const, label: "Items" },
  { key: "nextLink", type: "string" as const, label: "Next link" },
  { key: "pages", type: "number" as const, label: "Pages fetched" },
];

/** As `listOutput`, plus the delta round's terminating cursor. */
export const deltaOutput = [
  { key: "value", type: "array" as const, label: "Changed items" },
  { key: "nextLink", type: "string" as const, label: "Next link" },
  { key: "deltaLink", type: "string" as const, label: "Delta link" },
  { key: "pages", type: "number" as const, label: "Pages fetched" },
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
