import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  taskId: string;
  name: string;
  assignee?: string;
  assignee_status?: "inbox" | "today" | "upcoming" | "later";
  completed?: boolean;
  due_on?: string;
  liked?: boolean;
  notes?: string;
  workspace?: string;
}

const createSubtask: ActionDefinition<Input> = {
  key: "create-subtask",
  type: "perform",
  resource: "subtask",
  title: "Create Subtask",
  description: "Create a subtask under the given parent task.",
  params: [
    { key: "taskId", label: "Parent Task ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "assignee", label: "Assignee", type: "string" },
    {
      key: "assignee_status",
      label: "Assignee Status",
      type: "select",
      options: [
        { value: "inbox", label: "Inbox" },
        { value: "today", label: "Today" },
        { value: "upcoming", label: "Upcoming" },
        { value: "later", label: "Later" },
      ],
    },
    { key: "completed", label: "Completed", type: "boolean" },
    { key: "due_on", label: "Due On", type: "date" },
    { key: "liked", label: "Liked", type: "boolean" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "workspace", label: "Workspace ID", type: "string" },
  ],

  async execute(input, ctx) {
    const { taskId, ...rest } = input;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") body[k] = v;
    }
    return new AsanaClient(ctx).request(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      body,
    });
  },
};

export default createSubtask;
