import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** DELETE /v2/tasks/:id — delete a task. Not reversible without contacting Salesloft support. */
const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description:
    "Delete a task. This operation is not reversible without contacting Salesloft support.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    await client.request(`/tasks/${input.id}`, { method: "DELETE" });
    return { success: true };
  },
};

export default taskDelete;
