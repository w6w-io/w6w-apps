import type { ActionDefinition } from "@w6w/types";
import { groupIdParam, reportOutput } from "../lib/params.ts";
import { groupPath, PowerBIClient } from "../lib/client.ts";

interface Input {
  groupId?: string;
  reportId: string;
}

/**
 * `GET [/groups/{groupId}]/reports/{reportId}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-report ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-report-in-group
 *
 * Required scope: `Report.ReadWrite.All` or `Report.Read.All`.
 */
const getReport: ActionDefinition<Input> = {
  key: "get-report",
  type: "read",
  resource: "report",
  title: "Get Report",
  description: "Get a single report's metadata.",
  params: [
    groupIdParam,
    { key: "reportId", label: "Report ID", type: "string", required: true },
  ],
  output: reportOutput,

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.request(
      `${groupPath(input)}/reports/${encodeURIComponent(input.reportId)}`,
    );
  },
};

export default getReport;
