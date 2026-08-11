import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/collaborators` — the outside companies working
 * on this project.
 *
 * A collaborator row is thin on purpose: id, `company_id`,
 * `project_invitation_id` and `accepted_at`. It names the *company* that
 * accepted an invitation, not a person, and it carries no name — resolve the
 * company through the invitation that created it if you need one.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectCollaboratorList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-collaborator-list",
  type: "search",
  resource: "project",
  title: "List Project Collaborators",
  description: "List the outside companies collaborating on a project.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/collaborators`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectCollaboratorList;
