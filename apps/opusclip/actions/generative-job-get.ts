import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/generative-jobs/{jobId}` — poll a generative (thumbnail) job.
 *
 * For `thumbnail` jobs, `result.generatedThumbnailUris` holds the CDN URLs of
 * the produced thumbnails (typically 4) once `status` is `CONCLUDED`.
 */
interface Input {
  jobId: string;
}

const generativeJobGet: ActionDefinition<Input> = {
  key: "generative-job-get",
  type: "read",
  resource: "generative-job",
  title: "Get Generative Job",
  description: "Poll a thumbnail generation job for its status, progress, and result.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "result", type: "object", label: "Result (thumbnail URLs), when concluded" },
    { key: "progress", type: "object", label: "Progress snapshot" },
    { key: "error", type: "object", label: "Error, if failed" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).json(
      `/api/generative-jobs/${encodeURIComponent(input.jobId)}`,
    );
  },
};

export default generativeJobGet;
