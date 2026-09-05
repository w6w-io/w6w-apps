import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type GenericSuccessResponse } from "../lib/client.ts";

/** `DELETE /v1/api/tasks/{taskId}` — delete a task. */
interface Input {
  taskId: number;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).delete<GenericSuccessResponse>(`/tasks/${input.taskId}`);
  },
};

export default taskDelete;
