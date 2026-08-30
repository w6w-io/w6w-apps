import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient } from "../lib/client.ts";

interface Input {
  projectId: number;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description:
    "Permanently delete a project. Uses Teamwork's V1 endpoint (`DELETE /projects/{id}.json`).",
  // Deleting an already-deleted project id fails the same way on every
  // retry, which a retry policy can treat as already done.
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new TeamworkClient(ctx).request(`/projects/${input.projectId}.json`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default projectDelete;
