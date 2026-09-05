import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type GenericSuccessResponse } from "../lib/client.ts";

/** `PUT /v1/api/tasks/{taskId}/completed` — mark a task complete. */
interface Input {
  taskId: number;
}

const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task complete.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).put<GenericSuccessResponse>(
      `/tasks/${input.taskId}/completed`,
    );
  },
};

export default taskComplete;
