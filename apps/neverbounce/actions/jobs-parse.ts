import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
  autoStart?: boolean;
}

/**
 * `POST /jobs/parse` — parse a job created without Auto-Parse. Source: the
 * OAS `operationId: jobs-parse`. Returns a `queue_id`, not a result — parsing
 * is asynchronous; poll `jobs-status` (or use `callback_url` at job creation)
 * to know when it's done.
 *
 * `perform`, not `read`: it mutates job state on the vendor's side.
 * `idempotent: true` — parsing doesn't create a new resource (unlike
 * `jobs-create`), so retrying a timed-out call re-queues the same job rather
 * than duplicating anything.
 */
const jobsParse: ActionDefinition<Input> = {
  key: "jobs-parse",
  type: "perform",
  resource: "job",
  title: "Parse Job",
  description: "Begin parsing a job that wasn't created with Auto-Parse.",
  idempotent: true,
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
    },
    {
      key: "autoStart",
      label: "Auto-Start",
      type: "boolean",
      default: false,
      hint: "Run the job immediately after it finishes parsing.",
    },
  ],
  output: [
    { key: "queue_id", type: "string", label: "Queue id for this parse request" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/parse", {
      method: "POST",
      body: { job_id: input.jobId, auto_start: input.autoStart ?? false },
    });
  },
};

export default jobsParse;
