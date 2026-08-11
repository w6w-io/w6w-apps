import type { ActionDefinition } from "@w6w/types";
import { compact, PaddleClient } from "../lib/client.ts";
import { effectiveFromOptions } from "../lib/params.ts";

/**
 * `POST /subscriptions/{subscription_id}/cancel` — cancel a subscription.
 *
 * ## The default is *not* what most people expect
 *
 * Left alone, this schedules the cancellation for the end of the current
 * billing period: Paddle writes a `scheduled_change` and the subscription's
 * status **stays `active`** until the effective date. A workflow that cancels
 * and then asserts `status === "canceled"` will fail against a completely
 * successful call. Pass `immediately` to get the status change now.
 *
 * The one exception, which is Paddle's own: cancelling a subscription that is
 * already `paused` happens immediately regardless.
 *
 * ## This cannot be undone
 *
 * Paddle does not reinstate a canceled subscription — the customer has to
 * subscribe again. That is why the action is marked `idempotent: true` but the
 * description leads with the warning: re-running the same cancel is harmless,
 * running it once by mistake is not.
 */
interface Input {
  subscriptionId: string;
  effectiveFrom?: string;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Cancel a subscription. Cannot be undone. Defaults to the end of the billing period, where " +
    "the status stays `active` until then.",
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
      hint: "Defaults to the next billing period, which only schedules the cancellation — the " +
        "status remains `active` until it takes effect. Already-paused subscriptions always " +
        "cancel immediately.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated subscription" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/cancel`,
      { method: "POST", body: compact({ effective_from: input.effectiveFrom }) },
    );
  },
};

export default subscriptionCancel;
