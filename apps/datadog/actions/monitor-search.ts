import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/monitor/search` — the Manage Monitors search, as an API.
 *
 * Different from `monitor-list` in two ways that matter:
 *
 *  - **It is a real search**, taking the same `query` string as the Manage
 *    Monitors page. Datadog's own instruction is to run the search in the UI and
 *    copy the `query` value out of the page URL — that is the documented way to
 *    build one, and the reason this action exists alongside the tag filters on
 *    `monitor-list`.
 *  - **It is genuinely paginated and it says so**: the response is
 *    `{monitors, counts, metadata}` where `metadata` carries `page`,
 *    `page_count`, `per_page` and `total_count`, and `counts` breaks the result
 *    down by status, type, muted and tag. `monitor-list` returns a bare array
 *    with none of that.
 *
 * The vendor's own defaults are `page: 0`, `per_page: 30`, and both are kept.
 *
 * Needs the application key and the `monitors_read` scope.
 */
interface Input {
  query?: string;
  page?: number;
  perPage?: number;
  sort?: string;
}

const monitorSearch: ActionDefinition<Input> = {
  key: "monitor-search",
  type: "search",
  resource: "monitor",
  title: "Search Monitors",
  description: "Search monitors with the Manage Monitors query syntax, with facet counts.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      placeholder: "status:Alert type:metric",
      hint: "The same string the Manage Monitors page puts in its URL — run the search there " +
        "and copy the `query` value out.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Zero-based. Datadog's own default.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 30,
      validation: { integer: true, min: 1 },
      hint: "Datadog's own default is 30.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      placeholder: "name,asc",
      hint: "`field,direction` — for example `name,asc` or `status,desc`.",
    },
  ],
  output: [
    { key: "monitors", type: "array", label: "Matching monitors" },
    { key: "counts", type: "object", label: "Facet counts by status, type, muted and tag" },
    { key: "metadata", type: "object", label: "Paging metadata (page, page_count, total_count)" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/monitor/search", {
      query: {
        query: input.query,
        page: input.page,
        per_page: input.perPage,
        sort: input.sort,
      },
    });
  },
};

export default monitorSearch;
