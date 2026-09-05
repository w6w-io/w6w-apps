import type { ActionDefinition } from "@w6w/types";
import { subdomainFromConnection, WorkableClient } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

interface Input {
  target: string;
  event: string;
  jobShortcode?: string;
  stageSlug?: string;
}

/**
 * Registers a webhook subscription. Workable POSTs the triggering resource to
 * `target` when `event` fires, HMAC-SHA256-signed in the `X-Workable-Signature`
 * header (key = this access token) — verifying that signature is the
 * receiving endpoint's job, outside what an outbound Action can do.
 *
 * ## `args` is all-or-nothing, and only for candidate events
 *
 * Confirmed from both the endpoint's own request schema and the
 * "Webhook Subscriptions" guide: `args.account_id` must be present whenever
 * `args` is sent at all, and for a candidate-related event `job_shortcode`
 * and `stage_slug` must BOTH be present once you're filtering ("If you want
 * it for all jobs and stages, include an empty string as a parameter for
 * each"). The guide also warns employee-related events don't use `args` and
 * should omit it. So: `args` (with `account_id` from this connection's own
 * subdomain, never asked of the caller) is only sent when Job Shortcode or
 * Stage Slug is filled in, and the other of the pair is sent as `""` rather
 * than left out.
 */
const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Subscription",
  description: "Register a URL to receive a Workable event. Required scope: `r_candidates` or " +
    "`r_employees`. Target URLs must be unique — a duplicate answers 409.",
  idempotent: false,
  params: [
    { key: "target", label: "Target URL", type: "string", required: true },
    { key: "event", label: "Event", type: "select", required: true, options: webhookEventOptions },
    {
      key: "jobShortcode",
      label: "Job shortcode",
      type: "string",
      advanced: true,
      row: "filter",
      hint: "Candidate events only. Leave both this and Stage Slug blank for no filtering.",
    },
    { key: "stageSlug", label: "Stage slug", type: "string", advanced: true, row: "filter" },
  ],
  output: [{ key: "id", type: "number", label: "Subscription ID" }],

  execute(input, ctx) {
    const filtering = Boolean(input.jobShortcode || input.stageSlug);
    const body: Record<string, unknown> = { target: input.target, event: input.event };
    if (filtering) {
      body.args = {
        account_id: subdomainFromConnection(ctx.connection),
        job_shortcode: input.jobShortcode ?? "",
        stage_slug: input.stageSlug ?? "",
      };
    }
    return new WorkableClient(ctx).json("/subscriptions", { method: "POST", body });
  },
};

export default webhookSubscribe;
