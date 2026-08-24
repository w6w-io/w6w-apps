import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  taskId: number;
}

/**
 * `DELETE /v1/tasks/{id}` — delete a Task. Destructive and irreversible via
 * the API; also removes the task's own subtasks.
 *
 * Idempotent in the sense that matters for retries: deleting an
 * already-deleted Task converges on the same end state.
 */
const deleteTask: ActionDefinition<Input> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a Task. Destructive and irreversible.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    ctx.log("warn", "deleting task", { taskId: input.taskId });
    await new WealthboxClient(ctx).request(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default deleteTask;
