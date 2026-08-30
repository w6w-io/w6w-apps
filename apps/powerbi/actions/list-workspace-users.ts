import type { ActionDefinition } from "@w6w/types";
import { PowerBIClient } from "../lib/client.ts";
import { listOutput, pagingParams } from "../lib/params.ts";

interface Input {
  groupId: string;
  top?: number;
  skip?: number;
}

interface Output {
  value: unknown[];
}

/**
 * `GET /groups/{groupId}/users` — `?$top={$top}&$skip={$skip}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-group-users
 *
 * Returns every user/group/service-principal with access to the workspace,
 * and their `groupUserAccessRight` (Admin / Member / Contributor / Viewer).
 *
 * Required scope: `Workspace.Read.All` or `Workspace.ReadWrite.All`.
 *
 * Limitation the reference states: permission changes take time to propagate
 * and may not be immediately visible here — `Refresh User Permissions`
 * (a tenant-wide, user-scoped call this App does not offer) forces it.
 */
const listWorkspaceUsers: ActionDefinition<Input, Output> = {
  key: "list-workspace-users",
  type: "read",
  resource: "workspace",
  title: "List Workspace Users",
  description: "List the users, groups and service principals that have access to a workspace.",
  params: [
    { key: "groupId", label: "Workspace ID", type: "string", required: true },
    ...pagingParams(),
  ],
  output: listOutput("Workspace users"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(`/groups/${encodeURIComponent(input.groupId)}/users`, {
      query: { $top: input.top, $skip: input.skip },
    });
    return { value };
  },
};

export default listWorkspaceUsers;
