import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /v2/projects/{id}/restore` — un-archive a project.
 *
 * Note the verb: `restore` is a `PUT` while its counterpart `archive` is the
 * API's only `PATCH`. The pair is asymmetric in the vendor's own document.
 *
 * This restores an **archived** project. It is not an undelete: a project
 * removed with `project-delete` is gone, and nothing in the documented API
 * brings it back.
 *
 * Idempotent: restoring an active project leaves it active.
 */
interface Input {
  projectId: string;
}

const projectRestore: ActionDefinition<Input> = {
  key: "project-restore",
  type: "perform",
  resource: "project",
  title: "Restore Project",
  description: "Restore an archived project. Does not undo a deletion.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "archived", type: "boolean", label: "Archived" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/restore`, {
      method: "PUT",
    });
  },
};

export default projectRestore;
