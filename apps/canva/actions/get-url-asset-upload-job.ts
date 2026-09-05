import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

/**
 * `GET /v1/url-asset-uploads/{jobId}` — requires `asset:read`. Rate limited
 * to 180 requests/minute per user. Preview API — see create-url-asset-upload-job.
 */
const getUrlAssetUploadJob: ActionDefinition<Input> = {
  key: "get-url-asset-upload-job",
  type: "read",
  resource: "asset",
  title: "Get Asset Upload Job From URL",
  description: "Check the status of a URL asset upload job started by " +
    "create-url-asset-upload-job. Preview API — see description on that action.",
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
      `/rest/v1/url-asset-uploads/${encodeURIComponent(input.jobId)}`,
    );
    return res.job;
  },
};

export default getUrlAssetUploadJob;
