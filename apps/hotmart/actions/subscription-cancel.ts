import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PAYMENTS_PREFIX } from "../lib/client.ts";

/**
 * `POST /payments/api/v1/subscriptions/{subscriber_code}/cancel` — verified
 * against `developers.hotmart.com/docs/en/v1/subscription/cancel-subscription/`
 * on 2026-09-05. Interrupts the charge cycle and notifies Club/Webhook
 * sub-systems of the cancellation. Not idempotent: a second cancel on an
 * already-inactive subscription is rejected by Hotmart's own guard
 * (`it_can_not_cancel_subscription_status`).
 */
interface Input {
  subscriberCode: string;
  sendMail?: boolean;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  title: "Cancel Subscription",
  description: "Cancel a subscription and stop its future charges.",
  resource: "subscriptions",
  idempotent: false,
  params: [
    { key: "subscriberCode", label: "Subscriber code", type: "string", required: true },
    {
      key: "sendMail",
      label: "Notify buyer by email",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "subscriber_code", type: "string", label: "Subscriber code" },
    { key: "date_next_charge", type: "string", label: "Next charge date" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json(
      `${PAYMENTS_PREFIX}/subscriptions/${encodeURIComponent(input.subscriberCode)}/cancel`,
      { method: "POST", body: { send_mail: input.sendMail ?? false } },
    );
  },
};

export default subscriptionCancel;
