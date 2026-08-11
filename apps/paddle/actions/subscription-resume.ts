import type { ActionDefinition } from "@w6w/types";
import { compact, PaddleClient } from "../lib/client.ts";
import { onResumeOptions } from "../lib/params.ts";

/**
 * `POST /subscriptions/{subscription_id}/resume` — resume a paused subscription.
 *
 * ## `effective_from` means something different here
 *
 * On cancel and pause it is an enum (`immediately` | `next_billing_period`). On
 * resume it is either the literal `immediately` **or an RFC 3339 datetime** —
 * the two request shapes Paddle documents as "resume immediately" and "resume
 * on a specific date". It is therefore a free-text param here rather than a
 * select, with the two accepted forms spelled out.
 *
 * ## It usually charges money right away
 *
 * Resuming bills immediately by default and recalculates the billing dates from
 * the resume date. Paddle warns the response may be slow while that payment is
 * attempted. `on_resume: continue_existing_billing_period` is the way to avoid
 * the charge — and it errors if the existing period has already ended.
 *
 * This also works on an `active` subscription that has a *scheduled* pause: it
 * sets or changes the resume date on that pending change rather than resuming
 * anything.
 */
interface Input {
  subscriptionId: string;
  effectiveFrom?: string;
  onResume?: string;
}

const subscriptionResume: ActionDefinition<Input> = {
  key: "subscription-resume",
  type: "perform",
  resource: "subscription",
  title: "Resume Subscription",
  description:
    "Resume a paused subscription, or set the resume date on a scheduled pause. Usually results " +
    "in an immediate charge.",
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
      type: "string",
      placeholder: "immediately",
      hint:
        "Either the literal `immediately`, or an RFC 3339 datetime to resume on a future date. " +
        "Defaults to `immediately`. Unlike Cancel and Pause, this field accepts a date here.",
    },
    {
      key: "onResume",
      label: "On resume",
      type: "select",
      options: onResumeOptions,
      hint:
        "Defaults to starting a new billing period, which charges the full amount immediately. " +
        "Continuing the existing period avoids the charge but errors if that period has ended.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated subscription" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/resume`,
      {
        method: "POST",
        body: compact({ effective_from: input.effectiveFrom, on_resume: input.onResume }),
      },
    );
  },
};

export default subscriptionResume;
