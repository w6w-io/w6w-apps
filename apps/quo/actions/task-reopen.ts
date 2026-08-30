import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/reopen` — reopen a completed task. */
interface Input {
  taskId: string;
}

const taskReopen: ActionDefinition<Input> = {
  key: "task-reopen",
  type: "perform",
  resource: "task",
  title: "Reopen Task",
  description: "Reopen a completed task.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/reopen`, {
      method: "POST",
    });
  },
};

export default taskReopen;
