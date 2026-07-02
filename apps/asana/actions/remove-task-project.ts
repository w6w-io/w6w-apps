import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  project: string;
}

const removeTaskProject: ActionDefinition<Input> = {
  key: "remove-task-project",
  type: "perform",
  resource: "task-project",
  title: "Remove Task from Project",
  description: "Remove a task from a project.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "project", label: "Project ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.id}/removeProject`, {
      method: "POST",
      body: { project: input.project },
    });
  },
};

export default removeTaskProject;
