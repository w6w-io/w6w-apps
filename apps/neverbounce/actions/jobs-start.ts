import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
  runSample?: boolean;
}

/**
 * `POST /jobs/start` — start processing a job that has already been parsed.
 * Source: the OAS `operationId: jobs-start`. Like `jobs-parse`, this returns
 * a `queue_id` rather than a result — processing is asynchronous.
 *
 * `perform`, not `read`: it's a billable operation that begins consuming
 * credits. `idempotent: false` — starting an already-running or completed job
 * again is not a safe retry.
 */
const jobsStart: ActionDefinition<Input> = {
  key: "jobs-start",
  type: "perform",
  resource: "job",
  title: "Start Job",
  description: "Begin processing a job that has already been parsed.",
  idempotent: false,
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
    },
    {
      key: "runSample",
      label: "Run As Sample",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "queue_id", type: "string", label: "Queue id for this start request" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/start", {
      method: "POST",
      body: { job_id: input.jobId, run_sample: input.runSample ?? false },
    });
  },
};

export default jobsStart;
