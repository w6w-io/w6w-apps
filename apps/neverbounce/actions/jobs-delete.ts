import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
}

/**
 * `POST /jobs/delete` — permanently delete a job and its results. Source:
 * the OAS `operationId: jobs-delete`.
 *
 * `perform`, not `read`: it's destructive. `idempotent: true` — deleting is
 * idempotent by nature (the end state, "job gone", is the same whether this
 * is the first or a retried call); the vendor's docs don't specify what a
 * second delete of the same id returns, but no unwanted side effect can occur
 * from calling it again.
 */
const jobsDelete: ActionDefinition<Input> = {
  key: "jobs-delete",
  type: "perform",
  resource: "job",
  title: "Delete Job",
  description: "Permanently delete a bulk verification job and its results.",
  idempotent: true,
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
    },
  ],
  output: [{ key: "execution_time", type: "number", label: "Server-side execution time, in ms" }],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/delete", { method: "POST", body: { job_id: input.jobId } });
  },
};

export default jobsDelete;
