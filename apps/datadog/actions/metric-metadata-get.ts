import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";

/**
 * `GET /api/v1/metrics/{metric_name}` — a metric's declared metadata.
 *
 * Type, unit, per-unit, description, short name, the integration that owns it,
 * and `statsd_interval`. It is metadata *about the definition*, not a reading:
 * nothing here tells you whether the metric is currently reporting. Use
 * `metric-list` for that and `metric-query` for values.
 *
 * The metric name goes in the path. Datadog metric names are `a-zA-Z0-9._` by
 * its own naming rules, but the value arrives from a form, so it is escaped —
 * a pasted `system.cpu.user{host:x}` would otherwise change the request path.
 *
 * Needs the application key and the `metrics_read` scope.
 */
interface Input {
  metricName: string;
}

const metricMetadataGet: ActionDefinition<Input> = {
  key: "metric-metadata-get",
  type: "read",
  resource: "metric",
  title: "Get Metric Metadata",
  description: "Read a metric's declared type, unit and description.",
  params: [
    {
      key: "metricName",
      label: "Metric name",
      type: "string",
      required: true,
      placeholder: "system.cpu.user",
      hint: "The name only — no aggregation, no scope braces.",
    },
  ],
  output: [
    { key: "type", type: "string", label: "Metric type" },
    { key: "unit", type: "string", label: "Unit" },
    { key: "per_unit", type: "string", label: "Per-unit" },
    { key: "description", type: "string", label: "Description" },
    { key: "short_name", type: "string", label: "Short name" },
    { key: "integration", type: "string", label: "Owning integration" },
    { key: "statsd_interval", type: "number", label: "StatsD interval" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json(`/api/v1/metrics/${encodeSegment(input.metricName)}`);
  },
};

export default metricMetadataGet;
