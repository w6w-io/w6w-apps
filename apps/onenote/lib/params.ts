/**
 * Param fragments shared by the actions.
 *
 * Every action addresses a `{location}` (me / a user / a group / a
 * SharePoint site), most address a container (a notebook, a section group, or
 * a section) inside it, and the collections share one OData vocabulary, so
 * declaring those fields once keeps fifteen actions honest with each other.
 * Each helper returns a fresh array, so an action can splice in its own
 * fields without mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees
 * a concrete `Param[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * Which of the four `{location}` forms this call is rooted at. `me` needs no
 * further input; the other three need Location ID to mean anything, but that
 * is a runtime check (`onenoteBase()`) rather than a `required` flag, since
 * "required, but only when Location isn't me" is not a constraint a single
 * flag expresses.
 */
export function locationParams(): Param[] {
  return [
    {
      key: "location",
      label: "Location",
      type: "select",
      default: "me",
      advanced: true,
      options: [
        { value: "me", label: "Me (the signed-in user)" },
        { value: "user", label: "Another user (shared with me)" },
        { value: "group", label: "A Microsoft 365 group" },
        { value: "site", label: "A SharePoint site" },
      ],
      hint: "Whose OneNote content to address. Defaults to the signed-in user.",
    },
    {
      key: "locationId",
      label: "Location ID",
      type: "string",
      advanced: true,
      hint:
        "Required unless Location is \"Me\": the target user's id or userPrincipalName, the group's id, or the SharePoint site's id.",
    },
  ];
}

/** A notebook, addressed by its own `id` — the only form the reference documents. */
export const notebookIdParam: Param = {
  key: "notebookId",
  label: "Notebook ID",
  type: "string",
  required: true,
  placeholder: "1-e13f257d-78c6-46cf-ae8c-13686517ac5f",
  hint: "The notebook's `id` — from List Notebooks.",
};

/** A section group, addressed by its own `id`. */
export const sectionGroupIdParam: Param = {
  key: "sectionGroupId",
  label: "Section Group ID",
  type: "string",
  required: true,
  placeholder: "1-0b13154b-d92d-46c3-b18b-838c4c9fb88d",
  hint: "The section group's `id` — from List Section Groups.",
};

/** A section, addressed by its own `id`. */
export const sectionIdParam: Param = {
  key: "sectionId",
  label: "Section ID",
  type: "string",
  required: true,
  placeholder: "1-0bc35248-e4e2-4759-ad85-89407bceccfe",
  hint: "The section's `id` — from List Sections.",
};

/** A page, addressed by its own `id`. */
export const pageIdParam: Param = {
  key: "pageId",
  label: "Page ID",
  type: "string",
  required: true,
  hint: "The page's `id` — from List Pages.",
};

/**
 * Where to create or list a section/section group: under a notebook, under a
 * section group, or — leaving both empty — a flat listing across the whole
 * location. At most one of the two may be set for a create; the reference
 * documents no way to create directly under "everything".
 */
export function containerParams(
  opts: { forCreate?: boolean } = {},
): Param[] {
  const createNote = opts.forCreate
    ? " Exactly one is required to create — there is no flat 'creation' target."
    : " Leave both empty to list across every notebook and section group in the location.";
  return [
    {
      key: "notebookId",
      label: "Notebook ID",
      type: "string",
      hint:
        `Create/list directly under this notebook. Set this **or** Section Group ID, not both.${createNote}`,
    },
    {
      key: "sectionGroupId",
      label: "Section Group ID",
      type: "string",
      hint:
        `Create/list directly under this section group. Set this **or** Notebook ID, not both.${createNote}`,
    },
  ];
}

/** `$select` and `$expand` — supported on every resource this App reads. */
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
      default: opts.defaultTop ?? 20,
      validation: { integer: true, min: 1, max: 100 },
      hint: "OData `$top` — results per request. Pages cap at 100 per request.",
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

/** A resource's `displayName` at create time — every create endpoint's whole request body. */
export function displayNameParam(hint: string): Param {
  return {
    key: "displayName",
    label: "Name",
    type: "string",
    required: true,
    validation: { maxLength: 50 },
    hint,
  };
}

/** The `value`-shaped output every list action returns. */
export const listOutput = [
  { key: "value", type: "array" as const, label: "Items" },
  { key: "nextLink", type: "string" as const, label: "Next link" },
  { key: "pages", type: "number" as const, label: "Pages fetched" },
];

/** The notebook properties worth surfacing by default. */
export const notebookOutput = [
  { key: "id", type: "string" as const, label: "Notebook ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "isDefault", type: "boolean" as const, label: "Is default notebook" },
  { key: "isShared", type: "boolean" as const, label: "Is shared" },
  { key: "userRole", type: "string" as const, label: "Your role" },
  { key: "createdDateTime", type: "string" as const, label: "Created" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "links", type: "object" as const, label: "Open-in links" },
  { key: "self", type: "string" as const, label: "API URL" },
];

/** The section properties worth surfacing by default. */
export const sectionOutput = [
  { key: "id", type: "string" as const, label: "Section ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "isDefault", type: "boolean" as const, label: "Is default section" },
  { key: "createdDateTime", type: "string" as const, label: "Created" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "pagesUrl", type: "string" as const, label: "Pages API URL" },
  { key: "self", type: "string" as const, label: "API URL" },
];

/** The section group properties worth surfacing by default. */
export const sectionGroupOutput = [
  { key: "id", type: "string" as const, label: "Section group ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "createdDateTime", type: "string" as const, label: "Created" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "sectionsUrl", type: "string" as const, label: "Sections API URL" },
  { key: "sectionGroupsUrl", type: "string" as const, label: "Section groups API URL" },
  { key: "self", type: "string" as const, label: "API URL" },
];

/** The page properties worth surfacing by default. Metadata only — see `content` below. */
export const pageOutput = [
  { key: "id", type: "string" as const, label: "Page ID" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "createdDateTime", type: "string" as const, label: "Created" },
  { key: "lastModifiedDateTime", type: "string" as const, label: "Last modified" },
  { key: "level", type: "number" as const, label: "Indentation level" },
  { key: "order", type: "number" as const, label: "Order within section" },
  { key: "contentUrl", type: "string" as const, label: "Content URL" },
  { key: "links", type: "object" as const, label: "Open-in links" },
  { key: "self", type: "string" as const, label: "API URL" },
];
