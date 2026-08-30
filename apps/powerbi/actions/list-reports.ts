import type { ActionDefinition } from "@w6w/types";
import { groupIdParam, listOutput } from "../lib/params.ts";
import { groupPath, PowerBIClient } from "../lib/client.ts";

interface Input {
  groupId?: string;
}

interface Output {
  value: unknown[];
}

/**
 * `GET [/groups/{groupId}]/reports`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group
 *
 * Without a Workspace ID: reports in "My workspace", plus reports shared
 * directly with the caller and reports from shared apps. A report that lives
 * in a *shared workspace* only shows up when Workspace ID is set to that
 * workspace.
 *
 * A paginated report (RDL) has no dataset, so `datasetId` is absent from its
 * entry rather than null.
 *
 * Required scope: `Report.ReadWrite.All` or `Report.Read.All`.
 */
const listReports: ActionDefinition<Input, Output> = {
  key: "list-reports",
  type: "read",
  resource: "report",
  title: "List Reports",
  description: "List reports in a workspace, or in My workspace when no workspace is given.",
  params: [groupIdParam],
  output: listOutput("Reports"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(`${groupPath(input)}/reports`);
    return { value };
  },
};

export default listReports;
