import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

/**
 * `GET /v1/autofills/{jobId}` — requires `design:meta:read`.
 */
const getDesignAutofillJob: ActionDefinition<Input> = {
  key: "get-design-autofill-job",
  type: "read",
  resource: "design",
  title: "Get Design Autofill Job",
  description: "Check the status of a design autofill job started by create-design-autofill-job.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status (in_progress/success/failed)" },
    { key: "result", type: "object", label: "The autofilled design, once successful" },
    { key: "error", type: "object", label: "Error details, if the job failed" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ job: Record<string, unknown> }>(
      `/rest/v1/autofills/${encodeURIComponent(input.jobId)}`,
    );
    return res.job;
  },
};

export default getDesignAutofillJob;
