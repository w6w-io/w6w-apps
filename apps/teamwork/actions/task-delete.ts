import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient } from "../lib/client.ts";

interface Input {
  taskId: number;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task.",
  // Deleting an already-deleted task id fails the same way on every retry,
  // which a retry policy can treat as already done.
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new TeamworkClient(ctx).request(`/projects/api/v3/tasks/${input.taskId}.json`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default taskDelete;
