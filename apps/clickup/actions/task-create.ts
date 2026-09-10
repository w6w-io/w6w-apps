import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  listId: string;
  name: string;
  content?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  dueDate?: string;
  startDate?: string;
  parent?: string;
  notifyAll?: boolean;
  customFields?: unknown[];
}

/** ISO/date string -> epoch milliseconds, which is what ClickUp's `*_date` fields want. */
function epochMs(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a list.",
  idempotent: false,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "content", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "assignees",
      label: "Assignees",
      type: "json",
      hint: "Array of numeric user IDs, e.g. `[183, 184]`.",
    },
    { key: "tags", label: "Tags", type: "json", hint: 'Array of tag names, e.g. `["urgent"]`.' },
    { key: "status", label: "Status", type: "string", hint: "A status name defined on the list." },
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
    { key: "parent", label: "Parent task ID", type: "string", hint: "Create as a subtask." },
    { key: "notifyAll", label: "Notify all assignees", type: "boolean" },
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
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/list/${encodeURIComponent(input.listId)}/task`,
      {
        method: "POST",
        body: {
          name: input.name,
          content: input.content,
          assignees: input.assignees,
          tags: input.tags,
          status: input.status,
          priority: input.priority,
          due_date: epochMs(input.dueDate),
          start_date: epochMs(input.startDate),
          parent: input.parent,
          notify_all: input.notifyAll,
          custom_fields: input.customFields,
        },
      },
    );
  },
};

export default taskCreate;
