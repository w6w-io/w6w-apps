import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/** `GET /api/censor-jobs/{jobId}` — poll a censor job's status. */
interface Input {
  jobId: string;
}

const censorJobGet: ActionDefinition<Input> = {
  key: "censor-job-get",
  type: "read",
  resource: "censor-job",
  title: "Get Censor Job",
  description: "Get a censor job's current status.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "error", type: "string", label: "Error, if any" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).json(
      `/api/censor-jobs/${encodeURIComponent(input.jobId)}`,
    );
  },
};

export default censorJobGet;
