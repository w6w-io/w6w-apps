import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `DELETE /projects/{project_id}` — permanently delete a project.
 *
 * Answers `200` with `{project_id, project_deleted: boolean}`. **The HTTP
 * status alone does not prove the project is gone** — `project_deleted` is
 * the field to check, matching the same pattern `key-delete` has to handle
 * (see there). Idempotent: the end state after one call and after five is the
 * same project gone (a repeat call answers `404`, surfaced as an error).
 */
interface Input {
  projectId: string;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Permanently delete a project.",
  idempotent: true,
  params: [projectIdParam],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "project_deleted", type: "boolean", label: "Whether the project was actually deleted" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}`, {
      method: "DELETE",
    });
  },
};

export default projectDelete;
