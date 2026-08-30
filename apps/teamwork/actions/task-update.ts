import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { priorityHint, taskOutput } from "../lib/params.ts";

interface Input {
  taskId: number;
  name?: string;
  description?: string;
  status?: string;
  dueAt?: string;
  priority?: string;
  progress?: number;
  assigneeUserIds?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Change a task's fields, or mark it complete/incomplete via status. Only the " +
    "fields you set are touched.",
  // Same taskId every retry, and Teamwork's PATCH is a partial merge — safe
  // to retry with the same body.
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: '"completed" marks the task done; "reopened" or "new" reopens it. Not enumerated in ' +
        "Teamwork's schema (typed as an opaque string), so left as free text rather than a " +
        "hard-coded list that could reject a value the API accepts.",
    },
    { key: "dueAt", label: "Due date", type: "date" },
    { key: "priority", label: "Priority", type: "string", hint: priorityHint },
    {
      key: "progress",
      label: "Progress %",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "assigneeUserIds",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated. Replaces the existing assignees.",
    },
  ],
  output: taskOutput,

  execute(input, ctx) {
    const assignees = csvIds(input.assigneeUserIds);
    return new TeamworkClient(ctx).request(`/projects/api/v3/tasks/${input.taskId}.json`, {
      method: "PATCH",
      body: {
        task: {
          name: unset(input.name),
          description: unset(input.description),
          status: unset(input.status),
          dueAt: unset(input.dueAt),
          priority: unset(input.priority),
          progress: input.progress,
          assignees: assignees ? { userIds: assignees } : undefined,
        },
      },
    });
  },
};

export default taskUpdate;
