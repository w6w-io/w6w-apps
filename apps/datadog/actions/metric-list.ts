import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/metrics` — metric names that reported since a given time.
 *
 * The v1 endpoint rather than v2's `GET /api/v2/metrics`, deliberately. v2
 * returns *tag configurations* with a `page[size]` that defaults to its 10,000
 * maximum and an `include=metric_volumes` that multiplies the payload again; v1
 * returns the one thing this action is for — a flat list of names — behind a
 * single required `from`.
 *
 * `from` is POSIX **seconds**, and there is no `to`: the window is always
 * "from then until now". The response is `{from, metrics}` where `from` echoes
 * the value as a **string**, not the integer that was sent.
 *
 * Needs the application key and the `metrics_read` scope.
 */
interface Input {
  from: number;
  host?: string;
  tagFilter?: string;
}

const metricList: ActionDefinition<Input> = {
  key: "metric-list",
  type: "search",
  resource: "metric",
  title: "List Active Metrics",
  description: "List the metric names that have reported since a given time.",
  params: [
    {
      key: "from",
      label: "From",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "POSIX timestamp in **seconds**. The window runs from here to now; there is no end " +
        "parameter.",
    },
    {
      key: "host",
      label: "Host",
      type: "string",
      hint: "Only metrics carrying this hostname tag.",
    },
    {
      key: "tagFilter",
      label: "Tag filter",
      type: "string",
      placeholder: "env:prod",
      hint: "Boolean and wildcard expressions are supported. Datadog documents this as not " +
        "combinable with the Host filter.",
    },
  ],
  output: [
    { key: "metrics", type: "array", label: "Metric names" },
    {
      key: "from",
      type: "string",
      label: "Window start echoed by Datadog (a string, not a number)",
    },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/metrics", {
      query: { from: input.from, host: input.host, tag_filter: input.tagFilter },
    });
  },
};

export default metricList;
