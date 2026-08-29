import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient, SYNC_API_BASE } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `GET https://sync.api.cloudconvert.com/v2/jobs/{id}` — block until the job reaches a
 * terminal state, then return it.
 *
 * The synchronous twin of `job-get`. Same no-documented-timeout caveat as
 * `job-create-and-wait`, and the vendor's `redirect` parameter is omitted for the same
 * reason (see that action's doc comment).
 */
interface Input {
  jobId: string;
}

const jobWait: ActionDefinition<Input> = {
  key: "job-wait",
  type: "read",
  resource: "job",
  title: "Wait for Job",
  description: "Block until the job finishes or fails, then return it.",
  params: [jobIdParam],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status (finished or error)" },
    { key: "tasks", type: "array", label: "Tasks, including each task's result" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).data(`/jobs/${encodeURIComponent(input.jobId)}`, {
      base: SYNC_API_BASE,
    });
  },
};

export default jobWait;
