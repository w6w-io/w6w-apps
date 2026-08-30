import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId?: string;
  reportId: string;
  exportId: string;
}

interface Output {
  id?: string;
  status?: string;
  percentComplete?: number;
  resourceFileExtension?: string;
  [k: string]: unknown;
}

/**
 * `GET [/groups/{groupId}]/reports/{reportId}/exports/{exportId}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-export-to-file-status ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-export-to-file-status-in-group
 *
 * Poll this until `status` is `Succeeded` (then call Get Export File) or
 * `Failed`. `status` can also be `NotStarted`, `Running` or `Undefined`.
 *
 * Required scope: `Report.ReadWrite.All` or `Report.Read.All`.
 */
const getExportStatus: ActionDefinition<Input, Output> = {
  key: "get-export-status",
  type: "read",
  resource: "report",
  title: "Get Export Status",
  description: "Check the status of a report export job started by Export Report To File.",
  params: [
    groupIdParam,
    { key: "reportId", label: "Report ID", type: "string", required: true },
    { key: "exportId", label: "Export ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Export job ID" },
    { key: "status", type: "string", label: "Job status" },
    { key: "percentComplete", type: "number", label: "Percent complete" },
    { key: "resourceFileExtension", type: "string", label: "File extension" },
  ],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.request<Output>(
      `${groupPath(input)}/reports/${encodeURIComponent(input.reportId)}/exports/${
        encodeURIComponent(input.exportId)
      }`,
    );
  },
};

export default getExportStatus;
