import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/remove-due-date` — clear a task's due date. */
interface Input {
  taskId: string;
}

const taskRemoveDueDate: ActionDefinition<Input> = {
  key: "task-remove-due-date",
  type: "perform",
  resource: "task",
  title: "Remove Task Due Date",
  description: "Clear a task's due date.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/remove-due-date`, {
      method: "POST",
    });
  },
};

export default taskRemoveDueDate;
