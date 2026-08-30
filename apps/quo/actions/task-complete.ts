import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/complete` — mark a task as completed. */
interface Input {
  taskId: string;
}

const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task as completed.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/complete`, {
      method: "POST",
    });
  },
};

export default taskComplete;
