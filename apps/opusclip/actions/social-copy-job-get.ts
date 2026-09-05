import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/** `GET /api/social-copy-jobs/{jobId}` — poll a social copy job. */
interface Input {
  jobId: string;
}

const socialCopyJobGet: ActionDefinition<Input> = {
  key: "social-copy-job-get",
  type: "read",
  resource: "social-copy-job",
  title: "Get Social Copy Job",
  description: "Poll a social copy generation job for its status and generated copy.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cached", type: "boolean", label: "Result came from cache" },
    { key: "title", type: "string", label: "Generated title" },
    { key: "description", type: "string", label: "Generated description" },
    { key: "hashtags", type: "string", label: "Generated hashtags" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).data(
      `/api/social-copy-jobs/${encodeURIComponent(input.jobId)}`,
    );
  },
};

export default socialCopyJobGet;
