import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";

/**
 * `POST /create-batch-call` — dial a list of numbers from one `from_number`,
 * immediately or at a scheduled Unix-millisecond timestamp.
 *
 * Note this path carries no `/v2` or `/v3` prefix at all, unlike the single
 * call-creation endpoints — see `lib/client.ts` for why path prefixes here
 * are not a version of the whole API.
 *
 * `reserved_concurrency` matters more than it looks: Retell's per-org
 * concurrency limit (`get-concurrency`) is shared by inbound calls, other
 * outbound calls, and every batch. A batch with no reservation can starve
 * inbound calls to the same numbers for its whole run; setting this carves
 * out headroom the batch will never touch.
 *
 * `call_time_window` is a half-open `[startMin, endMin)` in MINUTES since
 * local midnight, per the vendor's own description — `9:00`-`17:00` is
 * `{startMin: 540, endMin: 1020}`, not hours, and cross-midnight windows
 * (e.g. 22:00-02:00) are rejected outright rather than wrapped.
 */
interface TimeWindow {
  startMin: number;
  endMin: number;
}

interface Input {
  fromNumber: string;
  tasks: Array<{
    toNumber: string;
    overrideAgentId?: string;
    dynamicVariables?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }>;
  name?: string;
  triggerTimestamp?: number;
  reservedConcurrency?: number;
  timeWindows?: TimeWindow[];
  timeWindowTimezone?: string;
}

interface Output {
  batch_call_id: string;
  name: string;
  from_number: string;
  scheduled_timestamp: number;
  total_task_count: number;
  [key: string]: unknown;
}

const createBatchCall: ActionDefinition<Input, Output> = {
  key: "create-batch-call",
  type: "perform",
  resource: "batch-call",
  title: "Create Batch Call",
  description: "Queue a batch of outbound phone calls from one number, immediately or scheduled.",
  idempotent: false,
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      placeholder: "+14157774444",
      hint: "E.164 format. Must be a number purchased from Retell or imported to Retell.",
    },
    {
      key: "tasks",
      label: "Tasks",
      type: "array",
      required: true,
      hint: "One entry per call to place.",
      item: {
        type: "object",
        fields: [
          { key: "toNumber", label: "To number", type: "string", required: true },
          { key: "overrideAgentId", label: "Override agent ID", type: "string" },
          { key: "dynamicVariables", label: "Dynamic variables", type: "json" },
          { key: "metadata", label: "Metadata", type: "json" },
        ],
      },
    },
    { key: "name", label: "Name", type: "string", hint: "For your own reference only." },
    {
      key: "triggerTimestamp",
      label: "Trigger at (Unix ms)",
      type: "number",
      hint: "Leave empty to send the batch immediately.",
    },
    {
      key: "reservedConcurrency",
      label: "Reserved concurrency",
      type: "number",
      hint: "Concurrency slots reserved for calls NOT triggered by this batch (e.g. inbound). " +
        "See get-concurrency for the org's total limit.",
    },
    {
      key: "timeWindows",
      label: "Allowed calling windows",
      type: "array",
      hint: "Half-open [start, end) minutes since local midnight, e.g. 540/1020 for 9am-5pm. " +
        "Leave empty to allow calling at any time.",
      item: {
        type: "object",
        fields: [
          { key: "startMin", label: "Start (minutes since midnight)", type: "number" },
          { key: "endMin", label: "End (minutes since midnight)", type: "number" },
        ],
      },
    },
    {
      key: "timeWindowTimezone",
      label: "Calling window timezone",
      type: "string",
      default: "America/Los_Angeles",
      hint: "IANA timezone. Only used when Allowed Calling Windows is set.",
    },
  ],
  output: [
    { key: "batch_call_id", type: "string", label: "Batch call ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "from_number", type: "string", label: "From number" },
    { key: "scheduled_timestamp", type: "number", label: "Scheduled timestamp" },
    { key: "total_task_count", type: "number", label: "Task count" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>("/create-batch-call", {
      method: "POST",
      body: compact({
        from_number: input.fromNumber,
        name: input.name,
        trigger_timestamp: input.triggerTimestamp,
        reserved_concurrency: input.reservedConcurrency,
        tasks: (input.tasks ?? []).map((t) =>
          compact({
            to_number: t.toNumber,
            override_agent_id: t.overrideAgentId,
            retell_llm_dynamic_variables: t.dynamicVariables,
            metadata: t.metadata,
          })
        ),
        call_time_window: input.timeWindows?.length
          ? {
            windows: input.timeWindows.map((w) => ({ start: w.startMin, end: w.endMin })),
            timezone: input.timeWindowTimezone,
          }
          : undefined,
      }),
    });
  },
};

export default createBatchCall;
