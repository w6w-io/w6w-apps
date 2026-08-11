import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/assigned_users` — the users assigned to a
 * project.
 *
 * Assigned users are members of the same company. They are a different set from
 * *collaborators* (`project-collaborator-list`), who belong to another company
 * and reach the project through an invitation.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectAssignedUserList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-assigned-user-list",
  type: "search",
  resource: "project",
  title: "List Assigned Users",
  description: "List the users of this company assigned to a project.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/assigned_users`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectAssignedUserList;
