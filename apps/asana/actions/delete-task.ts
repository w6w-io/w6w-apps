import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const deleteTask: ActionDefinition<Input> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task by ID.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.id}`, { method: "DELETE" });
  },
};

export default deleteTask;
