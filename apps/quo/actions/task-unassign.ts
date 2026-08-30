import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/unassign` — remove a user from a task's list of assignees. */
interface Input {
  taskId: string;
  userId: string;
}

const taskUnassign: ActionDefinition<Input> = {
  key: "task-unassign",
  type: "perform",
  resource: "task",
  title: "Unassign Task",
  description: "Remove a user from a task's list of assignees.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
    { key: "userId", label: "User ID", type: "string", required: true, placeholder: "US123abc" },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/unassign`, {
      method: "POST",
      body: { userId: input.userId },
    });
  },
};

export default taskUnassign;
