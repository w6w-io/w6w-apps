import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/hosts/totals` — how many hosts are active and up.
 *
 * Two numbers with Datadog's own definitions, and they are not the same number:
 * **active** means the host reported in the past *hour*, **up** means it
 * reported in the past *two* hours. So `total_up` is normally the larger of the
 * two, and `total_up - total_active` is roughly the set that has gone quiet in
 * the last hour — which is the interesting figure.
 *
 * `from` overrides the active window.
 *
 * Needs the application key and the `hosts_read` scope.
 */
interface Input {
  from?: number;
}

const hostTotalsGet: ActionDefinition<Input> = {
  key: "host-totals-get",
  type: "read",
  resource: "host",
  title: "Get Host Totals",
  description: "Count the hosts currently active and up in this organization.",
  params: [
    {
      key: "from",
      label: "Active since",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "POSIX timestamp in **seconds**, overriding the default one-hour active window.",
    },
  ],
  output: [
    { key: "total_active", type: "number", label: "Hosts that reported in the past hour" },
    { key: "total_up", type: "number", label: "Hosts that reported in the past two hours" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/hosts/totals", { query: { from: input.from } });
  },
};

export default hostTotalsGet;
