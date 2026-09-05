import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { taskOutput } from "../lib/params.ts";

interface Input {
  taskId: string;
  description?: string;
  clientId?: string;
}

/** `PUT /api/v1/tasks/{id}` — verified against `updateTask` and `TaskRequest`. */
const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "clientId", label: "Client ID", type: "string" },
  ],
  output: taskOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/tasks/${input.taskId}`, {
      method: "PUT",
      body: {
        description: unset(input.description),
        client_id: unset(input.clientId),
      },
    });
  },
};

export default taskUpdate;
