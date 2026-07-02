import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  assignee?: string;
  assignee_status?: "inbox" | "today" | "upcoming" | "later";
  completed?: boolean;
  due_on?: string;
  liked?: boolean;
  notes?: string;
  projects?: string[];
}

const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's fields.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
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
    { key: "projects", label: "Project IDs", type: "string", repeat: true },
  ],

  async execute(input, ctx) {
    const { id, ...rest } = input;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      body[k] = v;
    }
    return new AsanaClient(ctx).request(`/tasks/${id}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateTask;
