import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, DatadogClient, toList } from "../lib/client.ts";
import { metricTypeOptions, normalizeMetricPoints } from "../lib/params.ts";

/**
 * `POST /api/v2/series` — submit timeseries points.
 *
 * The v2 endpoint, not v1's `POST /api/v1/series`: v2 is what Datadog's own
 * clients emit, and it is the one that takes `resources` (a typed list) rather
 * than a bare `host` string.
 *
 * ## Three ways this silently loses data, all guarded here
 *
 * **Timestamps are POSIX seconds.** `MetricPoint.timestamp` is `int64` seconds.
 * Passing `Date.now()` — milliseconds, the reflex in JavaScript — places the
 * point roughly 55,000 years in the future, where Datadog accepts it with a
 * `202` and never graphs it. `normalizeMetricPoints` defaults the timestamp to
 * *seconds* and the hint says so.
 *
 * **The accepted window is 10 minutes ahead to 1 hour behind**, in the vendor's
 * own words. Outside it the response is still `202`. This action does not clamp
 * — clamping would move a user's data — so backfilling old points from a
 * workflow does not work and the hint says that too.
 *
 * **`type` is a number.** `0` unspecified, `1` count, `2` rate, `3` gauge. Not
 * the strings the Datadog UI shows everywhere else. `0` is the vendor default
 * and keeps whatever type the metric already has.
 *
 * ## Not idempotent, and it cannot be made so
 *
 * Datadog offers no idempotency key on this endpoint. Two submissions of the
 * same `(metric, timestamp)` do not deduplicate: for a `count` they add, which
 * is exactly the shape a retried step would corrupt. Marking this `idempotent`
 * would let the runtime double-count on any transient network error.
 *
 * ## What it needs
 *
 * The API key only (`security: [{apiKeyAuth: []}]`), so a connection with no
 * application key can run it. `202` with `{}` is the documented success.
 */
interface Input {
  metric: string;
  points: unknown;
  type?: number;
  tags?: string;
  unit?: string;
  interval?: number;
  host?: string;
  resources?: unknown;
}

const metricSubmit: ActionDefinition<Input> = {
  key: "metric-submit",
  type: "perform",
  resource: "metric",
  title: "Submit Metric",
  description: "Submit one or more points for a custom metric.",
  idempotent: false,
  params: [
    {
      key: "metric",
      label: "Metric name",
      type: "string",
      required: true,
      placeholder: "myapp.orders.processed",
      hint: "Dot-separated. A name Datadog has not seen before becomes a new custom metric, " +
        "which is a billable dimension — check your plan before generating names dynamically.",
    },
    {
      key: "points",
      label: "Points",
      type: "json",
      required: true,
      placeholder: '[{"timestamp": 1700000000, "value": 42}]',
      hint: 'A number (submitted at the current time), one {"timestamp", "value"} object, or an ' +
        "array of them. **Timestamps are POSIX seconds, not milliseconds**, and Datadog only " +
        "accepts points from 1 hour in the past to 10 minutes in the future — anything outside " +
        "that window is answered 202 and then dropped, so this cannot backfill history.",
    },
    {
      key: "type",
      label: "Metric type",
      type: "select",
      options: metricTypeOptions,
      hint: "Sent as the integer Datadog's v2 intake expects, not the name shown in the UI.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      placeholder: "env:prod,service:web",
      hint: "Comma-separated `key:value` tags. Each distinct tag combination is a separate " +
        "custom metric for billing.",
    },
    {
      key: "interval",
      label: "Interval (seconds)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Only meaningful for `count` and `rate` — the period the value covers.",
    },
    { key: "unit", label: "Unit", type: "string", advanced: true, placeholder: "byte" },
    {
      key: "host",
      label: "Host",
      type: "string",
      advanced: true,
      hint: 'Shorthand for a single `{name, type: "host"}` resource.',
    },
    {
      key: "resources",
      label: "Resources",
      type: "json",
      advanced: true,
      placeholder: '[{"name": "web-01", "type": "host"}]',
      hint: "Full resource list, if you need more than a host. Overrides the Host field.",
    },
  ],
  output: [
    { key: "metric", type: "string", label: "Metric submitted" },
    { key: "pointCount", type: "number", label: "Points submitted" },
    { key: "status", type: "number", label: "HTTP status (202 on acceptance)" },
  ],

  async execute(input, ctx) {
    const points = normalizeMetricPoints(
      typeof input.points === "string" ? asOptionalJson(input.points, "Points") : input.points,
      Math.floor(Date.now() / 1000),
    );
    const resources = asOptionalJson<Array<Record<string, unknown>>>(
      input.resources,
      "Resources",
    ) ?? (input.host ? [{ name: input.host, type: "host" }] : undefined);

    const series: Record<string, unknown> = { metric: input.metric, points };
    if (input.type !== undefined) series.type = input.type;
    if (input.interval !== undefined) series.interval = input.interval;
    if (input.unit) series.unit = input.unit;
    const tags = toList(input.tags);
    if (tags) series.tags = tags;
    if (resources) series.resources = resources;

    const status = await new DatadogClient(ctx).status("/api/v2/series", {
      method: "POST",
      body: { series: [series] },
    });
    ctx.log("info", "submitted metric points", {
      metric: input.metric,
      pointCount: points.length,
    });
    return { metric: input.metric, pointCount: points.length, status };
  },
};

export default metricSubmit;
