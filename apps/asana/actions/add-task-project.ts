import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  project: string;
  insert_after?: string;
  insert_before?: string;
  section?: string;
}

const addTaskProject: ActionDefinition<Input> = {
  key: "add-task-project",
  type: "perform",
  resource: "task-project",
  title: "Add Task to Project",
  description:
    "Add a task to a project, optionally placing it relative to another task or inside a section.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "project", label: "Project ID", type: "string", required: true },
    { key: "insert_after", label: "Insert After (Task ID)", type: "string" },
    { key: "insert_before", label: "Insert Before (Task ID)", type: "string" },
    { key: "section", label: "Section ID", type: "string" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { project: input.project };
    if (input.insert_after) body.insert_after = input.insert_after;
    if (input.insert_before) body.insert_before = input.insert_before;
    if (input.section) body.section = input.section;
    return new AsanaClient(ctx).request(`/tasks/${input.id}/addProject`, {
      method: "POST",
      body,
    });
  },
};

export default addTaskProject;
