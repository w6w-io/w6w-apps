import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/subscriptions/:id` — cancels an active subscription.
 *
 * Unlike Paddle's cancel (which defaults to scheduling the change), Lemon
 * Squeezy's cancel is immediate on the subscription's `status`/`cancelled`
 * fields — the vendor's own example response comes back with `status:
 * "cancelled"` right away. The subscription still runs until `ends_at` (the
 * customer keeps access through the period they already paid for); it is the
 * record's status that flips immediately, not the access window. Cancelling
 * cannot be undone through this endpoint — use `subscription-update` with
 * `cancelled: false` to resume before `ends_at` instead.
 */
interface Input {
  subscriptionId: string;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel an active subscription. The customer keeps access until `ends_at`.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "The cancelled Subscription object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      { method: "DELETE" },
    );
  },
};

export default subscriptionCancel;
