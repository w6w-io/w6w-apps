import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `PUT /v1/tasks/{taskId}` — update a task's title and description (only). */
interface Input {
  taskId: string;
  title: string;
  description: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's title and description. To change due date, assignment or " +
    "linked conversation, use the dedicated actions for those.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "PUT",
      body: { title: input.title, description: input.description },
    });
  },
};

export default taskUpdate;
