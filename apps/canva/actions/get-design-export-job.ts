import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  exportId: string;
}

/**
 * `GET /v1/exports/{exportId}` — no scope beyond a valid token is
 * documented. On success, `urls` holds the download link(s) — one per page
 * for formats that export per-page — valid for 24 hours.
 */
const getDesignExportJob: ActionDefinition<Input> = {
  key: "get-design-export-job",
  type: "read",
  resource: "export",
  title: "Get Design Export Job",
  description: "Check the status of a design export job started by create-design-export-job.",
  params: [
    { key: "exportId", label: "Export job ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status (in_progress/success/failed)" },
    { key: "urls", type: "array", label: "Download URLs, valid 24 hours" },
    { key: "error", type: "object", label: "Error details, if the job failed" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ job: Record<string, unknown> }>(
      `/rest/v1/exports/${encodeURIComponent(input.exportId)}`,
    );
    return res.job;
  },
};

export default getDesignExportJob;
