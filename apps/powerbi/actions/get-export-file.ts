import type { ActionDefinition } from "@w6w/types";
import { encodeBase64, groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId?: string;
  reportId: string;
  exportId: string;
}

interface Output {
  content: string;
  contentType: string;
}

/**
 * `GET [/groups/{groupId}]/reports/{reportId}/exports/{exportId}/file`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-file-of-export-to-file ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-file-of-export-to-file-in-group
 *
 * Only call this once Get Export Status reports `Succeeded`. The response is
 * the raw exported file — always binary here (PDF, PPTX, XLSX, …) — so it is
 * base64-encoded in the same way this pack's `box` App downloads a file,
 * since a w6w Action's response crosses the sandbox boundary as JSON.
 *
 * Required scope: `Report.ReadWrite.All` or `Report.Read.All`.
 */
const getExportFile: ActionDefinition<Input, Output> = {
  key: "get-export-file",
  type: "read",
  resource: "report",
  title: "Get Export File",
  description: "Download a finished report export as base64.",
  params: [
    groupIdParam,
    { key: "reportId", label: "Report ID", type: "string", required: true },
    { key: "exportId", label: "Export ID", type: "string", required: true },
  ],
  output: [
    { key: "content", type: "string", label: "File contents (base64)" },
    { key: "contentType", type: "string", label: "Content type" },
  ],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const { bytes, contentType } = await client.binary(
      `${groupPath(input)}/reports/${encodeURIComponent(input.reportId)}/exports/${
        encodeURIComponent(input.exportId)
      }/file`,
    );
    return { content: encodeBase64(bytes), contentType };
  },
};

export default getExportFile;
