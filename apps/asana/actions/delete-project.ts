import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const deleteProject: ActionDefinition<Input> = {
  key: "delete-project",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Delete a project by ID.",
  idempotent: true,
  params: [
    { key: "id", label: "Project ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/projects/${input.id}`, { method: "DELETE" });
  },
};

export default deleteProject;
