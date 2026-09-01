import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, subscriptionIdParam, testmodeParam } from "../lib/params.ts";

/** `DELETE /v2/customers/{id}/subscriptions/{subscriptionId}` — cancel a subscription. */
interface Input {
  customerId: string;
  subscriptionId: string;
  testmode?: boolean;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel a subscription. No further payments will be charged.",
  idempotent: true,
  params: [customerIdParam(), subscriptionIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).delete(
      `/customers/${encodeURIComponent(input.customerId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default subscriptionCancel;
