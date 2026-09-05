import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the collection-style parameters Ontraport
 * repeats, near-verbatim, across almost every `list`/`delete`/`tag`/`sequence`
 * endpoint in the reference doc: `start`/`range` pagination, `sort`/`sortDir`,
 * `condition` (the JSON criteria language), `search`/`searchNotes`, and
 * `group_id`/`performAll`.
 */

export const idParam: Param = {
  key: "id",
  label: "ID",
  type: "string",
  required: true,
  hint: "The numeric ID of the record.",
};

export const idsParam: Param = {
  key: "ids",
  label: "IDs",
  type: "string",
  hint: "Comma-separated list of IDs. A value of 0 selects every record of this type — combine " +
    "with Range/Condition to avoid an accidental mass action.",
};

export const startParam: Param = {
  key: "start",
  label: "Start offset",
  type: "number",
  advanced: true,
  hint: "The offset to start the search from.",
};

export const rangeParam: Param = {
  key: "range",
  label: "Range",
  type: "number",
  default: 50,
  advanced: true,
  hint: "Number of records to return. Ontraport's own maximum and default is 50 — this app " +
    "prefills that default explicitly rather than relying on the vendor's fallback.",
};

export const sortParam: Param = {
  key: "sort",
  label: "Sort field",
  type: "string",
  advanced: true,
};

export const sortDirParam: Param = {
  key: "sortDir",
  label: "Sort direction",
  type: "select",
  advanced: true,
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ],
};

export const conditionParam: Param = {
  key: "condition",
  label: "Condition",
  type: "json",
  advanced: true,
  hint: 'Ontraport\'s JSON criteria language, e.g. [{"field":{"field":"lastname"},"op":"=",' +
    '"value":{"value":"Smith"}}]. String together with "AND"/"OR".',
};

export const searchParam: Param = {
  key: "search",
  label: "Search",
  type: "string",
  advanced: true,
};

export const searchNotesParam: Param = {
  key: "searchNotes",
  label: "Search notes too",
  type: "boolean",
  advanced: true,
  hint: "Only applies alongside Search.",
};

export const groupIdParam: Param = {
  key: "groupId",
  label: "Group ID",
  type: "string",
  advanced: true,
  hint: "Act on every member of this group instead of (or in addition to) IDs. Requires " +
    '"Perform on whole group".',
};

export const performAllParam: Param = {
  key: "performAll",
  label: "Perform on whole group",
  type: "boolean",
  advanced: true,
  hint: "Required alongside a non-zero Group ID. Ontraport's own warning: a Group ID of 0 with " +
    "this on affects every record of this type.",
};

export const listFieldsParam: Param = {
  key: "listFields",
  label: "Fields to return",
  type: "string",
  advanced: true,
  hint: "Comma-separated list of fields to include in each result.",
};

/** The collection-query params shared by every `list` action, in the order the doc presents them. */
export const collectionParams: Param[] = [
  idsParam,
  startParam,
  rangeParam,
  sortParam,
  sortDirParam,
  conditionParam,
  searchParam,
  searchNotesParam,
  groupIdParam,
  performAllParam,
  listFieldsParam,
];

/** The subset shared by bulk delete/tag/sequence actions that take no `sort`/`listFields`. */
export const bulkActionParams: Param[] = [
  startParam,
  rangeParam,
  conditionParam,
  searchParam,
  groupIdParam,
  performAllParam,
];

export interface CollectionInput {
  ids?: string;
  start?: number;
  range?: number;
  sort?: string;
  sortDir?: string;
  condition?: unknown;
  search?: string;
  searchNotes?: boolean;
  groupId?: string;
  performAll?: boolean;
  listFields?: string;
}

export const extraFieldsParam: Param = {
  key: "extraFields",
  label: "Additional fields",
  type: "json",
  advanced: true,
  hint: "Object of field => value pairs merged into the request, for standard fields not " +
    "listed above and for custom fields (e.g. f1500). Custom list-selection fields must wrap " +
    'each option id in the delimiter, e.g. {"f1500": "*/*1*/*2*/*"}. Use ' +
    "GET /objects/meta to look up field names.",
};

/** Turn the shared collection-query input into Ontraport's query-string field names. */
export function collectionQuery(
  input: CollectionInput,
): Record<string, string | number | undefined> {
  return {
    ids: input.ids,
    start: input.start,
    range: input.range,
    sort: input.sort,
    sortDir: input.sortDir,
    condition: input.condition !== undefined && input.condition !== null && input.condition !== ""
      ? (typeof input.condition === "string" ? input.condition : JSON.stringify(input.condition))
      : undefined,
    search: input.search,
    searchNotes: input.searchNotes ? "1" : undefined,
    group_id: input.groupId,
    performAll: input.performAll ? "1" : undefined,
    listFields: input.listFields,
  };
}
