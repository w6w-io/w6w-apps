import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/tasks/{taskId}` — get a task by its unique identifier. */
interface Input {
  taskId: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get a task by its unique identifier.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Task (taskId, title, description, dueDate, assignedTo, assignedBy, " +
        "phoneNumberId, conversationId, activityId, phoneNumberGroupId, orgId, createdAt, " +
        "createdBy, completed, isDeleted, revision)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}`);
  },
};

export default taskGet;
