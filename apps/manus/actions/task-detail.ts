import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type Task, type TaskDetailResponse } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /v2/task.detail` — a task's current status and metadata. Use
 * `task-list-messages` for the full event history.
 */
interface Input {
  taskId: string;
}

const taskDetail: ActionDefinition<Input, Task> = {
  key: "task-detail",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a task's current status and metadata.",
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "task_type", type: "string", label: "Task type" },
    { key: "share_visibility", type: "string", label: "Share visibility" },
    { key: "title", type: "string", label: "Title" },
    { key: "credit_usage", type: "number", label: "Credits consumed" },
    { key: "task_url", type: "string", label: "URL to view the task in the Manus webapp" },
    { key: "agent_profile", type: "string", label: "Agent profile last used" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Last updated at (Unix seconds)" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<TaskDetailResponse>("/v2/task.detail", {
      query: { task_id: input.taskId },
    });
    return res.task;
  },
};

export default taskDetail;
