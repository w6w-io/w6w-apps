import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

/**
 * `POST /v1/subscriptions/{id}/cancel` — cancel a subscription.
 *
 * `cancelAtCycleEnd` lets the current, already-billed cycle finish instead
 * of stopping immediately.
 */
interface Input {
  id: string;
  cancelAtCycleEnd?: boolean;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel a subscription, immediately or at the end of the current billing cycle.",
  idempotent: true,
  params: [
    subscriptionIdParam(),
    {
      key: "cancelAtCycleEnd",
      label: "Cancel at cycle end",
      type: "boolean",
      default: false,
      hint: "Off: cancel immediately. On: let the already-billed current cycle finish first.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Now 'cancelled' (or pending cancellation)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      `/subscriptions/${encodeURIComponent(input.id)}/cancel`,
      input.cancelAtCycleEnd ? { cancel_at_cycle_end: 1 } : undefined,
    );
  },
};

export default subscriptionCancel;
