import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/projects/{id}` — delete a project. Answers `204` with no body.
 *
 * This deletes the project **and everything filed under it** — photos,
 * documents, comments, checklists. `project-archive` is the reversible
 * alternative and is almost always the one a workflow wants; a deleted project
 * can still be listed with `status=deleted`, but nothing here restores it
 * (`project-restore` restores an *archived* project, which is a different
 * state).
 *
 * Idempotent: deleting an already-deleted project converges on the same state.
 * The second call answers `404`, which surfaces as an error rather than being
 * swallowed — a workflow that cannot tell "I deleted it" from "it was never
 * there" is worse than one that says which happened.
 */
interface Input {
  projectId: string;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description:
    "Permanently delete a project and its photos, documents and comments. Prefer Archive " +
    "Project unless deletion is really what is wanted.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Everything filed under the project goes with it.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/projects/${encodeId(input.projectId)}`, {
      method: "DELETE",
    });
  },
};

export default projectDelete;
