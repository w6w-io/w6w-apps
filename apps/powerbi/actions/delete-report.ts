import type { ActionDefinition } from "@w6w/types";
import { groupIdParam } from "../lib/params.ts";
import { groupPath, PowerBIClient } from "../lib/client.ts";

interface Input {
  groupId?: string;
  reportId: string;
}

interface Output {
  status: number;
}

/**
 * `DELETE [/groups/{groupId}]/reports/{reportId}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/delete-report ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/delete-report-in-group
 *
 * Required scope: `Report.ReadWrite.All` (no Read-only alternative).
 */
const deleteReport: ActionDefinition<Input, Output> = {
  key: "delete-report",
  type: "perform",
  resource: "report",
  title: "Delete Report",
  description: "Delete a report from a workspace, or from My workspace when no workspace is given.",
  // Deleting an already-deleted report converges on the same "gone" state.
  idempotent: true,
  params: [
    groupIdParam,
    { key: "reportId", label: "Report ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.status(
      `${groupPath(input)}/reports/${encodeURIComponent(input.reportId)}`,
      { method: "DELETE" },
    );
  },
};

export default deleteReport;
