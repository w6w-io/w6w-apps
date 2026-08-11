import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";
import { cursorPageParams, timestampSortOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/events` — search the event stream.
 *
 * The v2 *read* endpoint is on `api.<site>` like everything else; only v2's
 * event **publish** endpoint moves to an intake host (see `event-post.ts`).
 *
 * ## `filter[from]` and `filter[to]` are milliseconds, as strings
 *
 * Datadog documents them as "timestamp for requested events, in milliseconds",
 * typed `string`. That is the second of this app's three time spellings — v1
 * takes seconds, v2 logs take date math — and a seconds value here silently
 * returns nothing rather than erroring, because 1970 really did have no events.
 *
 * ## Pagination is a cursor, not an offset
 *
 * `meta.page.after` from one response becomes `page[cursor]` on the next. Datadog
 * defaults `page[limit]` to 10 and caps it at 1,000; the default is kept because
 * 10 is already a safe number, unlike most vendors' defaults.
 *
 * Needs the application key and the `events_read` scope.
 */
interface Input {
  query?: string;
  from?: string;
  to?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

const eventSearch: ActionDefinition<Input> = {
  key: "event-search",
  type: "search",
  resource: "event",
  title: "Search Events",
  description: "Search the Datadog event stream with the events query syntax.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      placeholder: "source:jenkins status:error",
      hint: "Events search syntax. Leave empty to match everything in the window.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      placeholder: "1700000000000",
      hint: "Earliest event, in **milliseconds** since the epoch. Note this endpoint takes " +
        "milliseconds where the v1 endpoints take seconds.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      placeholder: "1700003600000",
      hint: "Latest event, in **milliseconds** since the epoch.",
    },
    { key: "sort", label: "Sort", type: "select", options: timestampSortOptions },
    ...cursorPageParams(10, 1000),
  ],
  output: [
    { key: "data", type: "array", label: "Events" },
    { key: "meta", type: "object", label: "Pagination metadata (`meta.page.after` is the cursor)" },
    { key: "links", type: "object", label: "Next-page link" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v2/events", {
      query: {
        "filter[query]": input.query,
        "filter[from]": input.from,
        "filter[to]": input.to,
        sort: input.sort,
        "page[limit]": input.limit,
        "page[cursor]": input.cursor,
      },
    });
  },
};

export default eventSearch;
