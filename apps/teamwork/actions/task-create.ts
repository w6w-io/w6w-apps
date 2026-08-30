import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { priorityHint, taskOutput } from "../lib/params.ts";

interface Input {
  tasklistId: number;
  name: string;
  description?: string;
  startAt?: string;
  dueAt?: string;
  priority?: string;
  estimatedMinutes?: number;
  assigneeUserIds?: string;
  tagIds?: string;
  private?: boolean;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a task list.",
  // Teamwork mints a new task id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "tasklistId", label: "Task list ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "startAt", label: "Start date", type: "date", row: "dates" },
    { key: "dueAt", label: "Due date", type: "date", row: "dates" },
    { key: "priority", label: "Priority", type: "string", hint: priorityHint },
    { key: "estimatedMinutes", label: "Estimated minutes", type: "number", advanced: true },
    {
      key: "assigneeUserIds",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", advanced: true, hint: "Comma-separated." },
    { key: "private", label: "Private", type: "boolean", advanced: true },
  ],
  output: taskOutput,

  execute(input, ctx) {
    const assignees = csvIds(input.assigneeUserIds);
    return new TeamworkClient(ctx).request(
      `/projects/api/v3/tasklists/${input.tasklistId}/tasks.json`,
      {
        method: "POST",
        body: {
          task: {
            name: input.name,
            description: unset(input.description),
            startAt: unset(input.startAt),
            dueAt: unset(input.dueAt),
            priority: unset(input.priority),
            estimatedMinutes: input.estimatedMinutes,
            assignees: assignees ? { userIds: assignees } : undefined,
            tagIds: csvIds(input.tagIds),
            private: input.private,
          },
        },
      },
    );
  },
};

export default taskCreate;
