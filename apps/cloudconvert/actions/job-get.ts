import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { includeJobParam, jobIdParam } from "../lib/params.ts";

/**
 * `GET /v2/jobs/{id}` — show a job's current status, even if it has not finished yet.
 *
 * The vendor's `redirect` query parameter is deliberately not exposed here — see
 * `job-create-and-wait.ts` for why redirecting to `storage.cloudconvert.com` is
 * incompatible with this app's declared egress and with a JSON-returning action.
 */
interface Input {
  jobId: string;
  include?: string[] | string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Show a job's current status and tasks.",
  params: [jobIdParam, includeJobParam],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "tasks", type: "array", label: "Tasks" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).data(`/jobs/${encodeURIComponent(input.jobId)}`, {
      query: { include: input.include },
    });
  },
};

export default jobGet;
