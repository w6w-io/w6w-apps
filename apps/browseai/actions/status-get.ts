import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";

/**
 * `GET /v2/status` — Browse AI's own task-execution queue status.
 *
 * Despite living under the "system" tag and describing Browse AI's own
 * infrastructure rather than the caller's account, this endpoint still
 * requires a valid credential — confirmed live on 2026-08-24, it answers the
 * same `401 unauthorized` unauthenticated as every other route. Worth running
 * before scheduling a burst of tasks: `UNDER_MAINTENANCE` means new tasks may
 * queue rather than start promptly. See `health/queue.ts`, which polls the
 * same endpoint as a standing check.
 */
interface Output {
  tasksQueueStatus: "OK" | "UNDER_MAINTENANCE";
}

const statusGet: ActionDefinition<Record<string, never>, Output> = {
  key: "status-get",
  type: "read",
  resource: "system",
  title: "Get System Status",
  description: "Check whether Browse AI's task-execution queue is running normally.",
  params: [],
  output: [
    { key: "tasksQueueStatus", type: "string", label: "Task queue status" },
  ],

  async execute(_input, ctx) {
    const body = await new BrowseAiClient(ctx).request<Output>("/status");
    return { tasksQueueStatus: body.tasksQueueStatus };
  },
};

export default statusGet;
