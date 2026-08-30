import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/change-due-date` — set a task's due date. */
interface Input {
  taskId: string;
  dueDate: string;
}

const taskChangeDueDate: ActionDefinition<Input> = {
  key: "task-change-due-date",
  type: "perform",
  resource: "task",
  title: "Change Task Due Date",
  description: "Set a task's due date.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
    { key: "dueDate", label: "Due date", type: "datetime", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/change-due-date`, {
      method: "POST",
      body: { dueDate: input.dueDate },
    });
  },
};

export default taskChangeDueDate;
