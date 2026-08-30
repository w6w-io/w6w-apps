import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/assign` — add a user to a task's list of assignees. */
interface Input {
  taskId: string;
  userId: string;
}

const taskAssign: ActionDefinition<Input> = {
  key: "task-assign",
  type: "perform",
  resource: "task",
  title: "Assign Task",
  description: "Assign a user to a task (adds to the list of assignees).",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
    { key: "userId", label: "User ID", type: "string", required: true, placeholder: "US123abc" },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/assign`, {
      method: "POST",
      body: { userId: input.userId },
    });
  },
};

export default taskAssign;
