import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";

/**
 * `GET /jobs/{jobID}` — poll the status of an asynchronous job (a `jobID`
 * returned by Create Table or Overwrite Table when `asynchronous` produced
 * one). Reports once rather than blocking until done — a workflow polls or
 * waits between steps, the same shape `job-status`/`task-get`-style actions
 * take elsewhere in this pack.
 */
interface Input {
  jobId: string;
}

interface Output {
  status: "running" | "succeeded" | "failed";
  result?: unknown;
  error?: { message: string };
}

const jobStatusGet: ActionDefinition<Input, Output> = {
  key: "job-status-get",
  type: "read",
  resource: "job",
  title: "Get Job Status",
  description: "Check the status of an asynchronous table job: running, succeeded, or failed.",
  params: [{ key: "jobId", label: "Job ID", type: "string", required: true }],
  output: [
    { key: "status", type: "string", label: "running | succeeded | failed" },
    { key: "result", type: "object", label: "The job's result, if it succeeded" },
    { key: "error", type: "object", label: "Error message, if it failed" },
  ],

  execute(input, ctx) {
    return new GlideClient(ctx).data<Output>(`/jobs/${encodeURIComponent(input.jobId)}`);
  },
};

export default jobStatusGet;
