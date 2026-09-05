import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, KnackClient } from "../lib/client.ts";
import {
  filtersParam,
  objectKeyParam,
  pageParam,
  rowsPerPageParam,
  sortFieldParam,
  sortOrderParam,
} from "../lib/params.ts";

/**
 * `GET /v1/objects/{object_key}/records` — list an Object's records.
 *
 * Mirrors what a filtered table view in the Builder or a Live App shows.
 * Pagination is `page`/`rows_per_page` (default 25, Knack's own maximum
 * 1,000 — `docs.knack.com/reference/pagination`); sorting is
 * `sort_field`/`sort_order` (`reference/sorting`); filtering is a JSON filter
 * tree passed as the `filters` query parameter, URL-encoded
 * (`reference/constructing-filters`).
 */
interface Input {
  objectKey: string;
  filters?: unknown;
  sortField?: string;
  sortOrder?: string;
  page?: number;
  rowsPerPage?: number;
}

const recordList: ActionDefinition<Input> = {
  key: "record-list",
  type: "search",
  resource: "record",
  title: "List Records",
  description: "List an Object's records, with Knack's own filters, sorting and pagination.",
  params: [
    objectKeyParam,
    filtersParam,
    sortFieldParam,
    sortOrderParam,
    pageParam,
    rowsPerPageParam,
  ],
  output: [
    { key: "total_pages", type: "number", label: "Total pages" },
    { key: "current_page", type: "number", label: "Current page" },
    { key: "total_records", type: "number", label: "Total matching records" },
    { key: "records", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const filters = asOptionalJson<Record<string, unknown>>(input.filters, "Filters");
    return new KnackClient(ctx).records(input.objectKey, {
      page: input.page,
      rows_per_page: input.rowsPerPage,
      sort_field: input.sortField,
      sort_order: input.sortField ? input.sortOrder : undefined,
      // Knack reads this as a URL-encoded JSON string in the query, same as the
      // Builder's own generated links — encodeURIComponent happens in
      // KnackClient via URLSearchParams, so passing the raw JSON text is correct.
      filters: filters ? JSON.stringify(filters) : undefined,
    });
  },
};

export default recordList;
