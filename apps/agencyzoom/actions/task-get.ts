import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/** `GET /v1/api/tasks/{taskId}` — a task's full detail. */
interface Input {
  taskId: number;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch a task's full detail.",
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "number", label: "Status (0 open, 1 done, 2 cancelled)" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "customerId", type: "number", label: "Linked customer/lead ID" },
    { key: "customerType", type: "string", label: '"customer" or "lead"' },
    { key: "assignees", type: "array", label: "Assigned users" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).get(`/tasks/${input.taskId}`);
  },
};

export default taskGet;
