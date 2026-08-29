import type { ActionDefinition } from "@w6w/types";
import { API_BASE, asJson, CloudConvertClient } from "../lib/client.ts";
import { tagParam, tasksParam, webhookUrlParam } from "../lib/params.ts";

/**
 * `POST /v2/jobs` — create a job and return immediately.
 *
 * ## Asynchronous: the response is a *starting* job, not a result
 *
 * You get the job back in `processing` status. The normal shape for anything that needs
 * the result is: create here, then poll Get Job or Wait For Job until the status is
 * terminal (`finished` or `error`), then read the export task's `result.files`. For the
 * common "one file in, one file out" case, `convert-url` in this app does all three beats
 * in a single call against the synchronous host instead.
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * CloudConvert documents no idempotency key for job creation (unlike its own webhook
 * creation, which does — see `webhook-create.ts`). Every call creates a new job and, once
 * its tasks run, spends real conversion credits, so a retry duplicates both the job and
 * the spend.
 */
interface Input {
  tasks: unknown;
  tag?: string;
  webhookUrl?: string;
}

const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a job with one or more tasks and return immediately, without waiting " +
    "for it to finish.",
  idempotent: false,
  params: [tasksParam, tagParam, webhookUrlParam],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "tasks", type: "array", label: "Tasks" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating CloudConvert job", { tag: input.tag });
    return new CloudConvertClient(ctx).data(`/jobs`, {
      base: API_BASE,
      method: "POST",
      body: {
        tasks: asJson(input.tasks, "Tasks"),
        tag: input.tag,
        webhook_url: input.webhookUrl,
      },
    });
  },
};

export default jobCreate;
