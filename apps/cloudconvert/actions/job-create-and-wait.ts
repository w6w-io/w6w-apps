import type { ActionDefinition } from "@w6w/types";
import { asJson, CloudConvertClient, SYNC_API_BASE } from "../lib/client.ts";
import { tagParam, tasksParam } from "../lib/params.ts";

/**
 * `POST https://sync.api.cloudconvert.com/v2/jobs` — create a job and block until it
 * reaches a terminal state, returning the finished (or failed) job.
 *
 * This is the synchronous twin of `job-create`, for the general task-graph case. For the
 * common "one file in, one file out" case, prefer `convert-url` — it builds the same
 * three-task shape (import URL, convert, export URL) for you and returns the output
 * file(s) directly instead of the raw job object.
 *
 * ## No documented timeout, and no `redirect` support here
 *
 * CloudConvert caps nothing on its own end for this call — its docs instead warn that
 * "your network stack might automatically time out requests if there is not data
 * transferred for a longer time" and recommend an async job plus a webhook for anything
 * slow (video encodes). There is no equivalent of Apify's hard 60-second ceiling to build
 * against.
 *
 * The vendor's `redirect` parameter (302 to the export URL) is deliberately not exposed:
 * following it would leave `api.cloudconvert.com`/`sync.api.cloudconvert.com` for
 * `storage.cloudconvert.com`, a host this app does not declare in `w6w.network.allow` —
 * and even if it were declared, the redirect target is the raw output file, not JSON, so
 * this client's `data()` could not parse it anyway. Read `result.files[].url` off the
 * export task in the returned job instead.
 */
interface Input {
  tasks: unknown;
  tag?: string;
}

const jobCreateAndWait: ActionDefinition<Input> = {
  key: "job-create-and-wait",
  type: "perform",
  resource: "job",
  title: "Create Job and Wait",
  description: "Create a job with one or more tasks and block until it finishes or fails, " +
    "returning the completed job.",
  idempotent: false,
  params: [tasksParam, tagParam],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status (finished or error)" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "tasks", type: "array", label: "Tasks, including each task's result" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating CloudConvert job and waiting for it to finish", { tag: input.tag });
    return new CloudConvertClient(ctx).data(`/jobs`, {
      base: SYNC_API_BASE,
      method: "POST",
      body: { tasks: asJson(input.tasks, "Tasks"), tag: input.tag },
    });
  },
};

export default jobCreateAndWait;
