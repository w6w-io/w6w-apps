import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, toList } from "../lib/client.ts";
import { logStorageTierOptions, timestampSortOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/logs/events/search` — search indexed logs.
 *
 * The POST form rather than `GET /api/v2/logs/events`, because a log query is
 * routinely longer than a URL should be and the two are otherwise the same
 * endpoint with the same response.
 *
 * ## `from` and `to` take date math
 *
 * `now-15m` and `now` are the vendor's own defaults for this endpoint, declared
 * in the `LogsQueryFilter` schema. Milliseconds and ISO timestamps also work.
 * This is the third of three time spellings in this app — v1 wants POSIX
 * seconds, v2 events want milliseconds, and only logs understand `now-15m`
 * (see `lib/params.ts`).
 *
 * ## Storage tier changes what "search" means
 *
 * `indexes` (the default) searches what your indexes retained, which is subject
 * to exclusion filters and retention. `online-archives` and `flex` search
 * different stores with different latency. A query that "returns nothing" very
 * often ran against the wrong tier.
 *
 * ## Permission
 *
 * Needs the application key. Reading log *content* additionally requires the
 * `logs_read_data` permission, which is separate from the index-level read and
 * is a common cause of a 403 on an otherwise working application key.
 *
 * Paging is by cursor: `meta.page.after` becomes `page[cursor]`.
 */
interface Input {
  query?: string;
  from?: string;
  to?: string;
  indexes?: string;
  storageTier?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

const logSearch: ActionDefinition<Input> = {
  key: "log-search",
  type: "search",
  resource: "log",
  title: "Search Logs",
  description: "Search indexed logs with the Datadog log search syntax.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      placeholder: "service:checkout status:error",
      hint: "Log search syntax. Datadog's own default is `*`, which matches everything in the " +
        "window.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      default: "now-15m",
      hint: "Date math (`now-15m`, `now-1h`), milliseconds since the epoch, or an ISO timestamp. " +
        "`now-15m` is Datadog's own default for this endpoint.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      default: "now",
      hint: "Same formats as From.",
    },
    {
      key: "indexes",
      label: "Indexes",
      type: "string",
      advanced: true,
      placeholder: "main,audit",
      hint: "Comma-separated index names. Datadog's default is every index.",
    },
    {
      key: "storageTier",
      label: "Storage tier",
      type: "select",
      options: logStorageTierOptions,
      advanced: true,
      hint: "A query that returns nothing is often pointed at the wrong tier.",
    },
    { key: "sort", label: "Sort", type: "select", options: timestampSortOptions },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Datadog's own default is 10; the maximum is 1000.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "Take it from `meta.page.after` of a previous response.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Log events" },
    { key: "meta", type: "object", label: "Pagination metadata (`meta.page.after` is the cursor)" },
    { key: "links", type: "object", label: "Next-page link" },
  ],

  execute(input, ctx) {
    const filter: Record<string, unknown> = {};
    if (input.query) filter.query = input.query;
    if (input.from) filter.from = input.from;
    if (input.to) filter.to = input.to;
    if (input.storageTier) filter.storage_tier = input.storageTier;
    const indexes = toList(input.indexes);
    if (indexes) filter.indexes = indexes;

    const page: Record<string, unknown> = {};
    if (input.limit !== undefined) page.limit = input.limit;
    if (input.cursor) page.cursor = input.cursor;

    const body: Record<string, unknown> = {};
    if (Object.keys(filter).length > 0) body.filter = filter;
    if (Object.keys(page).length > 0) body.page = page;
    if (input.sort) body.sort = input.sort;

    return new DatadogClient(ctx).json("/api/v2/logs/events/search", { method: "POST", body });
  },
};

export default logSearch;
