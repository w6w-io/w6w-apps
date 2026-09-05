import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

interface Input {
  subscriptionId: string;
}

/**
 * `POST /subscriptions/{id}/activate` — reactivate a cancelled subscription.
 * Scope: `write_subscriptions`. Clears `cancelled_at`,
 * `cancellation_reason` and `cancellation_reason_comments`, per the
 * reference. Response envelope: `{"subscription": {...}}`.
 *
 * Not marked idempotent: activating an already-active subscription is
 * undocumented behaviour.
 */
const subscriptionActivate: ActionDefinition<Input> = {
  key: "subscription-activate",
  type: "perform",
  resource: "subscription",
  title: "Activate Subscription",
  description: "Reactivate a cancelled subscription.",
  idempotent: false,
  params: [subscriptionIdParam],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "next_charge_scheduled_at", type: "string", label: "Next charge scheduled at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/activate`,
      "subscription",
      { method: "POST", body: {} },
    );
  },
};

export default subscriptionActivate;
