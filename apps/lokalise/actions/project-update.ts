import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `PUT /projects/{project_id}` — rename or redescribe a project. Requires the
 * *Manage settings* admin right.
 *
 * Idempotent: a partial-field overwrite where re-sending the same input always
 * leaves the project in the same state.
 */
interface Input {
  projectId: string;
  name?: string;
  description?: string;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's name and/or description.",
  idempotent: true,
  params: [
    projectIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}`, {
      method: "PUT",
      body: compact({ name: input.name, description: input.description }),
    });
  },
};

export default projectUpdate;
