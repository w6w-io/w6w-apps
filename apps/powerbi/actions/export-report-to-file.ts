import type { ActionDefinition } from "@w6w/types";
import { compact, groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

type FileFormat =
  | "PDF"
  | "PPTX"
  | "PNG"
  | "IMAGE"
  | "XLSX"
  | "DOCX"
  | "CSV"
  | "XML"
  | "MHTML"
  | "ACCESSIBLEPDF";

interface Input {
  groupId?: string;
  reportId: string;
  format: FileFormat;
  powerBIReportConfiguration?: Record<string, unknown>;
  paginatedReportConfiguration?: Record<string, unknown>;
}

interface Output {
  id?: string;
  status?: string;
  percentComplete?: number;
  resourceFileExtension?: string;
  [k: string]: unknown;
}

/**
 * `POST [/groups/{groupId}]/reports/{reportId}/ExportTo`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file-in-group
 *
 * Starts an asynchronous export job — the response is `202 Accepted` with the
 * job's initial state, not the file. Poll with Get Export Status, then
 * retrieve the finished file with Get Export File.
 *
 * `PDF`/`PPTX`/`PNG`/`IMAGE` apply to a Power BI report; `XLSX`/`DOCX`/`CSV`/
 * `XML`/`MHTML`/`ACCESSIBLEPDF` apply only to a **paginated** (RDL) report —
 * both families are offered here since this action has no way to know which
 * kind `reportId` names ahead of time; Power BI itself rejects a mismatched
 * combination.
 *
 * The `powerBIReportConfiguration` / `paginatedReportConfiguration` bodies
 * (page filters, bookmarks, RDL parameters, row-level-security identities,
 * …) are passed through as raw JSON, matching the reference's own request
 * shape, rather than modeled field-by-field — the configuration surface is
 * large and export defaults (the whole report, no filter) cover the common
 * case without it.
 *
 * Required scope: `Report.ReadWrite.All` or `Report.Read.All`, **and**
 * `Dataset.ReadWrite.All` or `Dataset.Read.All` (the reference lists both
 * families as required, since exporting reads the underlying dataset).
 */
const exportReportToFile: ActionDefinition<Input, Output> = {
  key: "export-report-to-file",
  type: "perform",
  resource: "report",
  title: "Export Report To File",
  description: "Start an asynchronous export of a report to a file format. Returns a job to poll.",
  // Every call starts a brand-new export job with its own id — never a retry
  // of a prior one.
  idempotent: false,
  params: [
    groupIdParam,
    { key: "reportId", label: "Report ID", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      options: [
        { value: "PDF", label: "PDF" },
        { value: "PPTX", label: "PowerPoint (PPTX)" },
        { value: "PNG", label: "PNG (Power BI reports only)" },
        { value: "IMAGE", label: "Image — BMP/EMF/GIF/JPEG/PNG/TIFF (paginated reports only)" },
        { value: "XLSX", label: "Excel (paginated reports only)" },
        { value: "DOCX", label: "Word (paginated reports only)" },
        { value: "CSV", label: "CSV (paginated reports only)" },
        { value: "XML", label: "XML (paginated reports only)" },
        { value: "MHTML", label: "MHTML (paginated reports only)" },
        { value: "ACCESSIBLEPDF", label: "Accessible PDF (paginated reports only)" },
      ],
    },
    {
      key: "powerBIReportConfiguration",
      label: "Power BI report configuration",
      type: "json",
      advanced: true,
      hint:
        "Raw `PowerBIReportExportConfiguration` object — page filters, page/bookmark selection, settings. Only meaningful for a Power BI (non-paginated) report.",
    },
    {
      key: "paginatedReportConfiguration",
      label: "Paginated report configuration",
      type: "json",
      advanced: true,
      hint:
        "Raw `PaginatedReportExportConfiguration` object — RDL parameter values, identities. Only meaningful for a paginated (RDL) report.",
    },
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
      `${groupPath(input)}/reports/${encodeURIComponent(input.reportId)}/ExportTo`,
      {
        method: "POST",
        body: compact({
          format: input.format,
          powerBIReportConfiguration: input.powerBIReportConfiguration,
          paginatedReportConfiguration: input.paginatedReportConfiguration,
        }),
      },
    );
  },
};

export default exportReportToFile;
