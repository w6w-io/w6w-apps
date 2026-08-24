import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";

/**
 * `POST /v1/job/check` — poll a background job started with `async: true` on
 * any other conversion/edit action. Request field is `jobid` (all lowercase,
 * per the endpoint's own Markdown table); the response field naming the same
 * job is `jobId` (camelCase) — the two differ deliberately, not a typo here.
 *
 * A `jobid` that was never created under this API key — or was created with
 * a different one — answers HTTP `404` (`{"errorCode":404,"error":true,
 * "message":"Job not found",...}`) rather than any of the four documented
 * status values; PDF.co's own docs say this is final for that key, so
 * treat a 404 here as "stop polling," not "keep trying."
 */
interface Input {
  jobid: string;
}

interface Output {
  status?: "working" | "success" | "failed" | "aborted";
  message?: string;
  url?: string;
  jobId?: string;
  pageCount?: number;
  jobDuration?: number;
}

const jobCheck: ActionDefinition<Input, Output> = {
  key: "job-check",
  type: "read",
  title: "Check Background Job",
  description: "Poll the status of a job started with async: true on another PDF.co action. " +
    "status is one of working, success, failed, or aborted.",
  params: [
    {
      key: "jobid",
      label: "Job ID",
      type: "string",
      required: true,
      hint: "The jobId returned when the original action was called with async: true.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Job status" },
    { key: "url", type: "string", label: "Output file URL (once status is success)" },
    { key: "message", type: "string", label: "Failure detail (when status is failed)" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/job/check", compact({ ...input }));
  },
};

export default jobCheck;
