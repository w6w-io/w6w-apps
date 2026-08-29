import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { includeTaskParam, taskIdParam } from "../lib/params.ts";

interface Input {
  taskId: string;
  include?: string[] | string;
}

/**
 * `GET /v2/tasks/{id}` — show a task's current status, even if it has not finished yet.
 */
const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Show a single task's status, payload and result.",
  params: [taskIdParam, includeTaskParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "job_id", type: "string", label: "Job ID" },
    { key: "operation", type: "string", label: "Operation" },
    { key: "status", type: "string", label: "Status" },
    { key: "result", type: "object", label: "Result (has a files key when finished)" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).data(`/tasks/${encodeURIComponent(input.taskId)}`, {
      query: { include: input.include },
    });
  },
};

export default taskGet;
