import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{id}/archive` — archive a project.
 *
 * The reversible counterpart of `project-delete`: the project and its contents
 * stay, they leave the active list. `project-restore` puts it back.
 *
 * **`PATCH`, and only `PATCH`.** This is the single endpoint in the whole API
 * that uses that verb — the other 61 are GET, POST, PUT or DELETE — and its
 * sibling `restore` is a `PUT`. Sending `PUT` here does not archive anything.
 *
 * It is also the only endpoint besides `GET /v2/videos/{id}` with a documented
 * `403`, which is what a plan or role that may not archive answers.
 *
 * Idempotent: archiving an archived project leaves it archived.
 */
interface Input {
  projectId: string;
}

const projectArchive: ActionDefinition<Input> = {
  key: "project-archive",
  type: "perform",
  resource: "project",
  title: "Archive Project",
  description: "Archive a project, keeping its photos and documents. Reversible with Restore.",
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
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/archive`, {
      method: "PATCH",
    });
  },
};

export default projectArchive;
