import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam, listOutput } from "../lib/params.ts";

interface Input {
  groupId?: string;
  dashboardId: string;
}

interface Output {
  value: unknown[];
}

/**
 * `GET [/groups/{groupId}]/dashboards/{dashboardId}/tiles`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-tiles ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-tiles-in-group
 *
 * Supported tiles are datasets and live tiles that embed a whole report page.
 * A tile title edited on the report *before* it was pinned to the dashboard
 * is not returned — the reference notes it must be edited on the dashboard
 * itself to appear here.
 *
 * Required scope: `Dashboard.ReadWrite.All` or `Dashboard.Read.All`.
 */
const listDashboardTiles: ActionDefinition<Input, Output> = {
  key: "list-dashboard-tiles",
  type: "read",
  resource: "dashboard",
  title: "List Dashboard Tiles",
  description: "List the tiles pinned to a dashboard.",
  params: [
    groupIdParam,
    { key: "dashboardId", label: "Dashboard ID", type: "string", required: true },
  ],
  output: listOutput("Tiles"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(
      `${groupPath(input)}/dashboards/${encodeURIComponent(input.dashboardId)}/tiles`,
    );
    return { value };
  },
};

export default listDashboardTiles;
