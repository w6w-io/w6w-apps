import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PAYMENTS_PREFIX } from "../lib/client.ts";

/**
 * `POST /payments/api/v1/subscriptions/{subscriber_code}/reactivate` —
 * verified against
 * `developers.hotmart.com/docs/en/v1/subscription/reactivate-subscription/`
 * on 2026-09-05.
 *
 * This does **not** reactivate immediately: it sends the subscriber an email
 * with a link, valid three days, asking them to accept the reactivation. A
 * workflow calling this should not assume the subscription is active again
 * once the call returns — it returns `INACTIVE` on success, reflecting the
 * pending-acceptance state, not a completed reactivation.
 */
interface Input {
  subscriberCode: string;
  charge?: boolean;
}

const subscriptionReactivate: ActionDefinition<Input> = {
  key: "subscription-reactivate",
  type: "perform",
  title: "Request Subscription Reactivation",
  description:
    "Send the subscriber a reactivation request (a link valid 3 days). The subscription stays " +
    "inactive until they accept — this call does not activate it immediately.",
  resource: "subscriptions",
  idempotent: false,
  params: [
    { key: "subscriberCode", label: "Subscriber code", type: "string", required: true },
    {
      key: "charge",
      label: "Charge on reactivation",
      type: "boolean",
      default: false,
      hint: "Issue a new charge once the subscriber accepts. The billing date stays the same as " +
        "before deactivation.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "subscriber_code", type: "string", label: "Subscriber code" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json(
      `${PAYMENTS_PREFIX}/subscriptions/${encodeURIComponent(input.subscriberCode)}/reactivate`,
      { method: "POST", body: { charge: input.charge ?? false } },
    );
  },
};

export default subscriptionReactivate;
