import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BaserowClient, mergeFilters, userFieldNamesFlag } from "../lib/client.ts";
import {
  fieldFiltersParam,
  filterTypeParam,
  tableIdParam,
  userFieldNamesParam,
} from "../lib/params.ts";

/**
 * `GET /api/database/rows/table/{table_id}/` — list rows.
 *
 * ## Three ways to filter, and they are not equivalent
 *
 *  - **`view_id`** applies a view's own filters *and* sorts. If the rows you
 *    want are already a saved view, this is one parameter instead of ten.
 *  - **`filter__{field}__{filter}`** are dynamically-named query parameters —
 *    `?filter__Name__contains=ada`. They cannot be enumerated by a form, so this
 *    action takes them as a JSON object (see `fieldFilters`).
 *  - **`filters`** is a JSON filter *tree* for nested AND/OR groups that the
 *    flat parameters cannot express.
 *
 * ## Pagination is `page`/`size`, and the envelope is Baserow's own
 *
 * The response is `{count, next, previous, results}`, returned whole rather than
 * unwrapped to `results`: without `count` and `next` a workflow cannot tell
 * whether it has seen everything.
 */
interface Input {
  tableId: number;
  userFieldNames?: boolean;
  viewId?: number;
  search?: string;
  orderBy?: string;
  fieldFilters?: unknown;
  filterType?: string;
  filters?: unknown;
  include?: string;
  exclude?: string;
  page?: number;
  size?: number;
}

const rowList: ActionDefinition<Input> = {
  key: "row-list",
  type: "search",
  resource: "row",
  title: "List Rows",
  description:
    "List a table's rows with optional search, filters, ordering and view scoping. Returns " +
    "Baserow's `{count, next, previous, results}` envelope.",
  params: [
    tableIdParam,
    userFieldNamesParam,
    {
      key: "viewId",
      label: "View ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Apply this view's own filters and sorts. The simplest option when one already exists.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Return only rows whose data matches this query.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: "-Name,Age",
      hint: "Comma-separated field names (or ids, with field names off). Ascending by default; " +
        "prefix with `-` for descending.",
    },
    fieldFiltersParam,
    filterTypeParam,
    {
      key: "filters",
      label: "Filter tree",
      type: "json",
      hint: "A nested JSON filter tree, for AND/OR groups the flat Field filters cannot express. " +
        "Baserow ignores the flat filters and Filter type when this is provided.",
    },
    {
      key: "include",
      label: "Include fields",
      type: "string",
      hint: "Comma-separated field names to return. All fields are returned by default.",
    },
    {
      key: "exclude",
      label: "Exclude fields",
      type: "string",
      hint: "Comma-separated field names to omit.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "size",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Rows per page. Baserow's default is 100.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matching rows" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Rows" },
  ],

  execute(input, ctx) {
    const query = mergeFilters({
      user_field_names: userFieldNamesFlag(input.userFieldNames),
      view_id: input.viewId,
      search: input.search,
      order_by: input.orderBy,
      filter_type: input.filterType,
      filters: input.filters === undefined || input.filters === null || input.filters === ""
        ? undefined
        // Baserow takes the filter tree as a JSON-serialised STRING in the query
        // string, so an object param is re-encoded here rather than passed on.
        : typeof input.filters === "string"
        ? input.filters
        : JSON.stringify(input.filters),
      include: input.include,
      exclude: input.exclude,
      page: input.page,
      size: input.size,
    }, asOptionalJson<Record<string, unknown>>(input.fieldFilters, "Field filters"));

    return new BaserowClient(ctx).request(`/api/database/rows/table/${input.tableId}/`, { query });
  },
};

export default rowList;
