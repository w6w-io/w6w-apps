import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam, listOutput } from "../lib/params.ts";

interface Input {
  groupId?: string;
}

interface Output {
  value: unknown[];
}

/**
 * `GET [/groups/{groupId}]/dashboards`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-dashboards ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-dashboards-in-group
 *
 * Without a Workspace ID: dashboards in "My workspace", plus dashboards
 * shared directly and from shared apps — a dashboard in a shared workspace
 * only shows up when Workspace ID names that workspace.
 *
 * Required scope: `Dashboard.ReadWrite.All` or `Dashboard.Read.All`.
 */
const listDashboards: ActionDefinition<Input, Output> = {
  key: "list-dashboards",
  type: "read",
  resource: "dashboard",
  title: "List Dashboards",
  description: "List dashboards in a workspace, or in My workspace when no workspace is given.",
  params: [groupIdParam],
  output: listOutput("Dashboards"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(`${groupPath(input)}/dashboards`);
    return { value };
  },
};

export default listDashboards;
