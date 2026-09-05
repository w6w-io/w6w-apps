import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/exports/{id}` — poll until `status` is `completed` or `failed`.
 * Verified against `management/get-export-status.md`. `gammaId` in the
 * response is always the parent FILE id, even when a page/doc id was passed
 * to Export Gamma — the vendor's own note says it "resolves to its parent
 * gamma", so it may differ from what you sent.
 */
interface Input {
  exportId: string;
}

const getExportStatus: ActionDefinition<Input> = {
  key: "get-export-status",
  type: "read",
  resource: "gamma",
  title: "Get Export Status",
  description:
    "Poll an export job. When complete, the response includes exportUrl. render_timeout and " +
    "export_failed are safe to retry; deck_too_large and no_content require changing the input.",
  params: [
    { key: "exportId", label: "Export ID", type: "string", required: true },
  ],
  output: [
    { key: "exportId", type: "string", label: "Export Job ID" },
    { key: "exportAs", type: "string", label: "Requested export format" },
    { key: "status", type: "string", label: "pending | completed | failed" },
    { key: "gammaId", type: "string", label: "Canonical (parent) file ID" },
    { key: "exportUrl", type: "string", label: "Download URL — when completed" },
    {
      key: "error",
      type: "object",
      label: "{ reason, message, statusCode } — when failed",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(`/exports/${encodeURIComponent(input.exportId)}`);
  },
};

export default getExportStatus;
