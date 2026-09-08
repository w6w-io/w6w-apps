import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  taskId: number;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task from Capsule.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new CapsuleClient(ctx).request(`/tasks/${input.taskId}`, { method: "DELETE" });
    return {};
  },
};

export default taskDelete;
