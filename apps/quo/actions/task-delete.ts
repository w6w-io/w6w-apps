import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `DELETE /v1/tasks/{taskId}` — delete a task by ID. Returns 204. */
interface Input {
  taskId: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task by its unique identifier.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete request was accepted" },
  ],

  async execute(input, ctx) {
    await new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default taskDelete;
