import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

/**
 * `GET /v1/asset-uploads/{jobId}` — requires `asset:read`. Poll this until
 * `status` is `success` (the response then includes the created `asset`) or
 * `failed` (the response includes an `error.code`/`error.message`).
 */
const getAssetUploadJob: ActionDefinition<Input> = {
  key: "get-asset-upload-job",
  type: "read",
  resource: "asset",
  title: "Get Asset Upload Job",
  description: "Check the status of an asset upload job started by create-asset-upload-job.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status (in_progress/success/failed)" },
    { key: "asset", type: "object", label: "The created asset, once successful" },
    { key: "error", type: "object", label: "Error details, if the job failed" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ job: Record<string, unknown> }>(
      `/rest/v1/asset-uploads/${encodeURIComponent(input.jobId)}`,
    );
    return res.job;
  },
};

export default getAssetUploadJob;
