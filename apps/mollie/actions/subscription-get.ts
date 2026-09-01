import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, subscriptionIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  subscriptionId: string;
  testmode?: boolean;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve a single subscription for a customer.",
  params: [customerIdParam(), subscriptionIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/customers/${encodeURIComponent(input.customerId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default subscriptionGet;
