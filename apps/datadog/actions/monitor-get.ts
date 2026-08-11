import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";
import { asInteger } from "../lib/params.ts";

/**
 * `GET /api/v1/monitor/{monitor_id}` — one monitor, including its current state.
 *
 * `overall_state` is the field a workflow branches on: `OK`, `Alert`, `Warn`,
 * `No Data`, `Skipped`, `Ignored`, `Unknown`. Per-group detail arrives only when
 * `groupStates` asks for it, which is why that parameter exists here at all.
 *
 * The monitor id is `int64` in Datadog's schema, so a form string is converted
 * rather than interpolated — `asInteger` rejects `12.5` and `abc` here instead
 * of letting Datadog answer 400 for a reason that reads like a server fault.
 *
 * Needs the application key and the `monitors_read` scope.
 */
interface Input {
  monitorId: number | string;
  groupStates?: string;
  withDowntimes?: boolean;
}

const monitorGet: ActionDefinition<Input> = {
  key: "monitor-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor",
  description: "Fetch a monitor's definition and current alert state.",
  params: [
    {
      key: "monitorId",
      label: "Monitor ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The numeric id from the monitor's URL in Datadog.",
    },
    {
      key: "groupStates",
      label: "Group states",
      type: "string",
      advanced: true,
      placeholder: "all",
      hint: "Comma-separated, from `all`, `alert`, `warn`, `no data`. Without it the response " +
        "carries the overall state only.",
    },
    { key: "withDowntimes", label: "Include active downtimes", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "overall_state", type: "string", label: "Overall state (OK / Alert / Warn / No Data)" },
    { key: "type", type: "string", label: "Monitor type" },
    { key: "query", type: "string", label: "Query" },
    { key: "tags", type: "array", label: "Monitor tags" },
  ],

  // `async` even though nothing is awaited before the call: `asInteger` can
  // throw, and a synchronous throw out of `execute` escapes a caller that only
  // guards the returned promise. The other two validating actions
  // (`metric-submit`, `downtime-schedule`) are already async, so this keeps one
  // failure mode across the app instead of two.
  async execute(input, ctx) {
    const id = asInteger(input.monitorId, "Monitor ID");
    return await new DatadogClient(ctx).json(`/api/v1/monitor/${encodeSegment(id)}`, {
      query: {
        group_states: input.groupStates,
        with_downtimes: input.withDowntimes === true ? "true" : undefined,
      },
    });
  },
};

export default monitorGet;
