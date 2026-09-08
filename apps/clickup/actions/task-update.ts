import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  taskId: string;
  name?: string;
  content?: string;
  status?: string;
  priority?: number;
  dueDate?: string;
  startDate?: string;
  parent?: string;
  addAssignees?: number[];
  removeAssignees?: number[];
  customFields?: unknown[];
}

function epochMs(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Patch a task's fields. Assignees are added/removed, not replaced.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "content", label: "Description", type: "text", config: { multiline: true } },
    { key: "status", label: "Status", type: "string" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: 1, label: "Urgent" },
        { value: 2, label: "High" },
        { value: 3, label: "Normal" },
        { value: 4, label: "Low" },
      ],
    },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "startDate", label: "Start date", type: "datetime" },
    { key: "parent", label: "Parent task ID", type: "string" },
    {
      key: "addAssignees",
      label: "Add assignees",
      type: "json",
      hint: "Array of numeric user IDs to add.",
    },
    {
      key: "removeAssignees",
      label: "Remove assignees",
      type: "json",
      hint: "Array of numeric user IDs to remove.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Array of `{id, value}`, e.g. `[{"id": "abc-123", "value": "Gold"}]`.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const assignees = (input.addAssignees?.length || input.removeAssignees?.length)
      ? { add: input.addAssignees ?? [], rem: input.removeAssignees ?? [] }
      : undefined;
    return new ClickUpClient(ctx).request(
      `/task/${encodeURIComponent(input.taskId)}`,
      {
        method: "PUT",
        body: {
          name: input.name,
          content: input.content,
          status: input.status,
          priority: input.priority,
          due_date: epochMs(input.dueDate),
          start_date: epochMs(input.startDate),
          parent: input.parent,
          assignees,
          custom_fields: input.customFields,
        },
      },
    );
  },
};

export default taskUpdate;
