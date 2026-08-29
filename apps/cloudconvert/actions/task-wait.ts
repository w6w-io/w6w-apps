import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient, SYNC_API_BASE } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

interface Input {
  taskId: string;
}

/**
 * `GET https://sync.api.cloudconvert.com/v2/tasks/{id}` — block until the task reaches a
 * terminal state, then return it. Same no-documented-timeout caveat as `job-wait`.
 */
const taskWait: ActionDefinition<Input> = {
  key: "task-wait",
  type: "read",
  resource: "task",
  title: "Wait for Task",
  description: "Block until the task finishes or fails, then return it.",
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Status (finished or error)" },
    { key: "result", type: "object", label: "Result (has a files key when finished)" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).data(`/tasks/${encodeURIComponent(input.taskId)}`, {
      base: SYNC_API_BASE,
    });
  },
};

export default taskWait;
