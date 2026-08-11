import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/query` — evaluate a metric query over a time window.
 *
 * ## `from` and `to` are POSIX **seconds**
 *
 * Both are `int64` seconds, and this is the first of three incompatible time
 * spellings in this app's surface (see `lib/params.ts`): v2 events want
 * milliseconds and v2 logs want date math. A millisecond value here asks for a
 * window fifty thousand years wide and comes back empty rather than erroring.
 *
 * ## A 200 can still carry an error
 *
 * `MetricsQueryResponse` has both a `status` field and an `error` field, and
 * Datadog returns `200` with `status: "error"` for a query that parses but
 * cannot be evaluated. This action surfaces both verbatim instead of flattening
 * them, because "the HTTP call worked and the query did not" is exactly the case
 * a workflow needs to branch on.
 *
 * `series` is empty rather than absent when a valid query matches nothing, which
 * is not an error — the metric may simply not have reported in that window.
 *
 * Needs the application key and the `timeseries_query` scope.
 */
interface Input {
  query: string;
  from: number;
  to: number;
}

const metricQuery: ActionDefinition<Input> = {
  key: "metric-query",
  type: "read",
  resource: "metric",
  title: "Query Metrics",
  description: "Evaluate a Datadog metric query over a time window and return the timeseries.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "avg:system.cpu.user{*}by{host}",
      hint: "Datadog metric query syntax, exactly as in a dashboard widget.",
    },
    {
      key: "from",
      label: "From",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Start of the window, as a POSIX timestamp in **seconds** (not milliseconds).",
    },
    {
      key: "to",
      label: "To",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "End of the window, as a POSIX timestamp in **seconds**.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Query status" },
    { key: "series", type: "array", label: "Timeseries" },
    { key: "error", type: "string", label: "Query error, if the query failed" },
    { key: "res_type", type: "string", label: "Result type" },
    { key: "from_date", type: "number", label: "Window start, milliseconds" },
    { key: "to_date", type: "number", label: "Window end, milliseconds" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/query", {
      query: { query: input.query, from: input.from, to: input.to },
    });
  },
};

export default metricQuery;
