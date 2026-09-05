import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type TaskUpdateResponse } from "../lib/client.ts";
import { shareVisibilityOptions, taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/task.update` — update a task's title, sharing and task-list
 * visibility. `idempotent: true`: setting the same metadata twice converges
 * to the same end state.
 */
interface Input {
  taskId: string;
  title?: string;
  shareVisibility?: string;
  enableVisibleInTaskList?: boolean;
}

const taskUpdate: ActionDefinition<Input, TaskUpdateResponse> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's title, sharing or task-list visibility.",
  idempotent: true,
  params: [
    taskIdParam,
    { key: "title", label: "Title", type: "string" },
    {
      key: "shareVisibility",
      label: "Share visibility",
      type: "select",
      options: shareVisibilityOptions,
    },
    {
      key: "enableVisibleInTaskList",
      label: "Show in task list",
      type: "boolean",
      hint: "When off, hides the task from the Manus webapp's task list (still reachable via URL).",
    },
  ],
  output: [
    { key: "task_id", type: "string", label: "Task ID" },
    { key: "task_title", type: "string", label: "Current title" },
    { key: "task_url", type: "string", label: "URL to view the task in the Manus webapp" },
    { key: "share_url", type: "string", label: "Public share URL, when not private" },
    { key: "share_visibility", type: "string", label: "Actual share visibility" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskUpdateResponse>("/v2/task.update", {
      method: "POST",
      body: compact({
        task_id: input.taskId,
        title: input.title,
        share_visibility: input.shareVisibility,
        enable_visible_in_task_list: input.enableVisibleInTaskList,
      }),
    });
  },
};

export default taskUpdate;
