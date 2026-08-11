import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";
import { usageBreakdownOptions, usageIntervalOptions, usageMetricOptions } from "../lib/params.ts";

/**
 * `GET /v1/usage/character-stats` — usage over a window, as a time series.
 *
 * Where Get Subscription answers "how much is left right now", this answers
 * "where did it go" — which voice, which model, which API key, which day.
 *
 * ## The timestamps are in MILLISECONDS, and only here
 *
 * `start_unix` and `end_unix` are documented as "UTC Unix timestamp … in
 * milliseconds". Every other Unix timestamp in this API — `date_unix` on a
 * history item, `next_character_count_reset_unix` on the subscription, the
 * history date filters — is in **seconds**. Passing seconds here silently
 * returns an empty series dated to 1970 rather than an error, which is exactly
 * the kind of bug that gets blamed on the vendor for an afternoon.
 *
 * The vendor also notes the window is inclusive of whatever days the timestamps
 * land in: use `00:00:00` for the first day and `23:59:59` for the last.
 *
 * ## The response is two parallel arrays
 *
 * `time` is the axis (one timestamp per bucket) and `usage` is a map from
 * breakdown key to an array of the same length. With `breakdown_type: "none"`
 * there is a single series; with `"voice"` there is one per voice. They are
 * positional — `usage[k][i]` belongs to `time[i]` — so reordering either one
 * loses the correspondence.
 *
 * `breakdown_type: "user"` is documented as invalid unless workspace metrics are
 * included, which is why that toggle sits next to it in the form.
 */
interface Input {
  startUnix: number;
  endUnix: number;
  metric?: string;
  breakdownType?: string;
  aggregationInterval?: string;
  includeWorkspaceMetrics?: boolean;
}

const usageCharacterStatsGet: ActionDefinition<Input> = {
  key: "usage-character-stats-get",
  type: "read",
  resource: "account",
  title: "Get Usage Stats",
  description:
    "Read usage over a time window as a series, optionally broken down by voice, model, API key " +
    "or user.",
  params: [
    {
      key: "startUnix",
      label: "Window start (Unix MILLISECONDS)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Milliseconds, not seconds — this endpoint is the only one in the API that wants " +
        "them. Use 00:00:00 of the first day you want included.",
    },
    {
      key: "endUnix",
      label: "Window end (Unix MILLISECONDS)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Milliseconds. Use 23:59:59 of the last day you want included.",
    },
    {
      key: "metric",
      label: "Metric",
      type: "select",
      options: usageMetricOptions,
      hint: "Defaults to credits.",
    },
    {
      key: "breakdownType",
      label: "Break down by",
      type: "select",
      options: usageBreakdownOptions,
      hint: "Defaults to no breakdown. `By user` also requires workspace metrics below.",
    },
    {
      key: "aggregationInterval",
      label: "Bucket size",
      type: "select",
      options: usageIntervalOptions,
      hint: "Defaults to one bucket per day.",
    },
    {
      key: "includeWorkspaceMetrics",
      label: "Include the whole workspace",
      type: "boolean",
      hint: "Off by default: the series covers this key's own usage. Required for the `By user` " +
        "breakdown.",
    },
  ],
  output: [
    { key: "time", type: "array", label: "The time axis, one entry per bucket" },
    {
      key: "usage",
      type: "object",
      label: "Breakdown key to values, positionally aligned with `time`",
    },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/usage/character-stats", {
      query: {
        start_unix: input.startUnix,
        end_unix: input.endUnix,
        metric: input.metric,
        breakdown_type: input.breakdownType,
        aggregation_interval: input.aggregationInterval,
        include_workspace_metrics: input.includeWorkspaceMetrics === true ? "true" : undefined,
      },
    });
  },
};

export default usageCharacterStatsGet;
