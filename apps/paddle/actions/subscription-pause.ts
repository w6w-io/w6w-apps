import type { ActionDefinition } from "@w6w/types";
import { compact, PaddleClient } from "../lib/client.ts";
import { effectiveFromOptions, onResumeOptions } from "../lib/params.ts";

/**
 * `POST /subscriptions/{subscription_id}/pause` — pause a subscription.
 *
 * Same scheduling behaviour as cancel: by default Paddle writes a
 * `scheduled_change` for the end of the billing period and the status stays
 * `active` until it lands. `immediately` flips it to `paused` now.
 *
 * Omitting `resume_at` pauses **indefinitely** — the subscription stays paused
 * until something explicitly resumes it. That is a valid choice, but it is a
 * choice, so the hint names it.
 *
 * `on_resume` is decided here rather than at resume time because it governs
 * what happens when the *scheduled* resume fires. Its default,
 * `start_new_billing_period`, charges the full amount immediately on resume.
 */
interface Input {
  subscriptionId: string;
  effectiveFrom?: string;
  resumeAt?: string;
  onResume?: string;
}

const subscriptionPause: ActionDefinition<Input> = {
  key: "subscription-pause",
  type: "perform",
  resource: "subscription",
  title: "Pause Subscription",
  description:
    "Pause a subscription, optionally with a resume date. Defaults to the end of the billing " +
    "period.",
  idempotent: true,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      validation: { pattern: "^sub_[a-z0-9]{26}$" },
    },
    {
      key: "effectiveFrom",
      label: "Effective from",
      type: "select",
      options: effectiveFromOptions,
      hint: "Defaults to the next billing period; the status stays `active` until then.",
    },
    {
      key: "resumeAt",
      label: "Resume at",
      type: "datetime",
      hint: "RFC 3339 datetime. Leave empty to pause indefinitely until explicitly resumed.",
    },
    {
      key: "onResume",
      label: "On resume",
      type: "select",
      options: onResumeOptions,
      hint: "Defaults to starting a new billing period, which charges in full on resume.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated subscription" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/pause`,
      {
        method: "POST",
        body: compact({
          effective_from: input.effectiveFrom,
          resume_at: input.resumeAt,
          on_resume: input.onResume,
        }),
      },
    );
  },
};

export default subscriptionPause;
