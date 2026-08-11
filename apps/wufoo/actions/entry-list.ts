import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, mergeFilters, unwrap, WufooClient } from "../lib/filters.ts";

/**
 * `GET /forms/{identifier}/entries.json` — a form's submissions.
 *
 * ## Filters are numbered query parameters with a three-word value
 *
 * Wufoo's filter syntax is `Filter1=Field1+Is_equal_to+value`, `Filter2=…`, and
 * a `match` of `AND` or `OR` joining them. It cannot be expressed as a form
 * field, so this action takes them as a JSON array of `{field, operator, value}`
 * objects and numbers them here. The operators are a closed set, published by
 * the vendor and validated before anything is sent — a typo in one is otherwise
 * an empty result set rather than an error.
 *
 * ## Dates are interpreted as Pacific time, not UTC
 *
 * The vendor's own words: "We do not adjust your input filter date/time, so all
 * dates/times are interpreted as PST/PDT (UTC -8/-7)". A workflow filtering on
 * "yesterday" in UTC will be off by up to eight hours. Format is MySQL DATETIME,
 * `YYYY-MM-DD HH:MM:SS`.
 *
 * ## Paging
 *
 * `pageStart` is an offset and `pageSize` is capped at **100** (default 25).
 */
interface Input {
  identifier: string;
  filters?: unknown;
  match?: string;
  sort?: string;
  sortDirection?: string;
  pageStart?: number;
  pageSize?: number;
  system?: boolean;
}

const entryList: ActionDefinition<Input> = {
  key: "entry-list",
  type: "search",
  resource: "entry",
  title: "List Form Entries",
  description:
    "List a form's submissions, with Wufoo's filters, sorting and paging. Filter dates are " +
    "interpreted in Pacific time.",
  params: [
    {
      key: "identifier",
      label: "Form hash or title",
      type: "string",
      required: true,
      placeholder: "s1afea8b1vk0jf7",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint:
        'An array of `{"field": "Field1", "operator": "Is_equal_to", "value": "Wufoo"}`. Field ' +
        "ids come from List Form Fields; `EntryId` and `DateCreated` also work. Dates are MySQL " +
        "format (`YYYY-MM-DD HH:MM:SS`) and are read as Pacific time.",
    },
    {
      key: "match",
      label: "Match",
      type: "select",
      options: [
        { value: "AND", label: "AND — every filter must match" },
        { value: "OR", label: "OR — any filter may match" },
      ],
      hint: "How multiple filters combine.",
    },
    {
      key: "sort",
      label: "Sort by field",
      type: "string",
      placeholder: "EntryId",
      hint: "A field id, or `EntryId`.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    {
      key: "pageStart",
      label: "Page start (offset)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "The entry the page starts from. An offset, not a page number.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Default 25, maximum 100.",
    },
    {
      key: "system",
      label: "Include system fields",
      type: "boolean",
      hint: "Adds Wufoo's metadata (entry id, date created, IP) to each entry.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Entries — keyed by field id, e.g. `Field1`" }],

  async execute(input, ctx) {
    const query = mergeFilters({
      match: input.match,
      sort: input.sort,
      sortDirection: input.sortDirection,
      pageStart: input.pageStart,
      pageSize: input.pageSize,
      system: input.system,
    }, asOptionalJson(input.filters, "Filters"));

    const body = await new WufooClient(ctx).request(
      `/forms/${encodeURIComponent(input.identifier)}/entries.json`,
      { query },
    );
    return unwrap(body, "Entries");
  },
};

export default entryList;
