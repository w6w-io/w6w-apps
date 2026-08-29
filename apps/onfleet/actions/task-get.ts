import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `GET /tasks/:id` — fetch a task, including `completionDetails` once it is
 * done, `delayTime` if it is running late, `eta` while active, and
 * `routePlan` if it belongs to one.
 */
const action: ActionDefinition = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get task",
  description: "Fetch a single task by ID.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "state", type: "number", label: "0 unassigned · 1 assigned · 2 active · 3 completed" },
    { key: "trackingURL", type: "string", label: "Live tracking URL" },
    { key: "eta", type: "number", label: "Seconds to arrival, while active" },
    { key: "delayTime", type: "number", label: "Seconds late, if delayed" },
  ],

  async execute(input, ctx) {
    const { taskId } = input as { taskId: string };
    if (!taskId) throw new Error("`taskId` is required");
    return await new OnfleetClient(ctx).request(`/tasks/${encodeURIComponent(taskId)}`);
  },
};

export default action;
