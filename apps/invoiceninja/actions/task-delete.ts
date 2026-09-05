import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/** `DELETE /api/v1/tasks/{id}` — verified against `deleteTask`. Soft delete. */
const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Soft-delete a task.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/tasks/${input.taskId}`, { method: "DELETE" });
    return {};
  },
};

export default taskDelete;
