import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/invitations` — collaboration invitations for a
 * project.
 *
 * Each row carries `invite_url`, and that URL **is** the capability: anyone
 * holding it can accept the invitation and reach the project. It is returned
 * because sending it is the entire point of an invitation, but treat a workflow
 * that logs or forwards it exactly as you would treat a password.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectInvitationList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-invitation-list",
  type: "search",
  resource: "project",
  title: "List Project Invitations",
  description:
    "List a project's collaboration invitations. Each carries an invite_url that grants access.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/invitations`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectInvitationList;
