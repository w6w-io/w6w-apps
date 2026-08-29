import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";

/**
 * `GET /workers/:id` — fetch a worker, including their assigned task queue.
 *
 * Set `analytics` to also get duty-event, distance and time totals — for the
 * last week by default, or the `from`/`to` window given (max 24 hours).
 */
const action: ActionDefinition = {
  key: "worker-get",
  type: "read",
  resource: "worker",
  title: "Get worker",
  description: "Fetch a worker, optionally with duty/distance/time analytics.",
  params: [
    { key: "workerId", label: "Worker ID", type: "string", required: true },
    {
      key: "analytics",
      label: "Include analytics",
      type: "boolean",
      default: false,
    },
    {
      key: "from",
      label: "Analytics from (Unix ms)",
      type: "number",
      default: "",
      advanced: true,
      hint: "With `to`, narrows analytics to a window of at most 24 hours.",
    },
    { key: "to", label: "Analytics to (Unix ms)", type: "number", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Worker ID" },
    { key: "onDuty", type: "boolean", label: "On duty" },
    { key: "tasks", type: "array", label: "Assigned task IDs" },
  ],

  async execute(input, ctx) {
    const { workerId, analytics, from, to } = input as {
      workerId: string;
      analytics?: boolean;
      from?: number;
      to?: number;
    };
    if (!workerId) throw new Error("`workerId` is required");

    return await new OnfleetClient(ctx).request(`/workers/${encodeURIComponent(workerId)}`, {
      query: compact({ analytics: analytics === true ? true : undefined, from, to }) as Record<
        string,
        string | number | boolean
      >,
    });
  },
};

export default action;
