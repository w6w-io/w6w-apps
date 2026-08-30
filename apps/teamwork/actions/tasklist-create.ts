import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";

interface Input {
  projectId: number;
  name: string;
  description?: string;
  private?: boolean;
}

const tasklistCreate: ActionDefinition<Input> = {
  key: "tasklist-create",
  type: "perform",
  resource: "tasklist",
  title: "Create Task List",
  description: "Create a task list in a project. Uses Teamwork's V1 endpoint " +
    "(`POST /projects/{id}/tasklists.json`).",
  // Teamwork mints a new task-list id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "private", label: "Private", type: "boolean", advanced: true },
  ],
  output: [
    { key: "TASKLISTID", type: "string", label: "Task list ID" },
    { key: "STATUS", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request(`/projects/${input.projectId}/tasklists.json`, {
      method: "POST",
      body: {
        "todo-list": {
          name: input.name,
          description: unset(input.description),
          private: input.private,
        },
      },
    });
  },
};

export default tasklistCreate;
