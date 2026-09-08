import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
}

/**
 * `GET /jobs/status` — poll a job's lifecycle state and result totals.
 * Source: the OAS `operationId: jobs-status`.
 */
const jobsStatus: ActionDefinition<Input> = {
  key: "jobs-status",
  type: "read",
  resource: "job",
  title: "Get Job Status",
  description: "Check a bulk verification job's progress and result totals.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Job id" },
    { key: "filename", type: "string", label: "Job filename" },
    { key: "job_status", type: "string", label: "Job status" },
    { key: "percent_complete", type: "number", label: "Percent complete" },
    { key: "total", type: "object", label: "Result totals by category" },
    { key: "bounce_estimate", type: "number", label: "Estimated bounce rate" },
    { key: "failure_reason", type: "string", label: "Why the job failed, if it did" },
    { key: "created_at", type: "string", label: "When the job was created" },
    { key: "started_at", type: "string", label: "When processing started" },
    { key: "finished_at", type: "string", label: "When processing finished" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/status", { query: { job_id: input.jobId } });
  },
};

export default jobsStatus;
