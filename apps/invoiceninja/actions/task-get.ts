import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { taskOutput } from "../lib/params.ts";

interface Input {
  taskId: string;
}

/** `GET /api/v1/tasks/{id}` — verified against `showTask`. */
const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single task by hashed ID.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: taskOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/tasks/${input.taskId}`);
  },
};

export default taskGet;
