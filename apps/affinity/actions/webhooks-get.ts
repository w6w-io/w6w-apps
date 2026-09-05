import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { webhookIdPathParam } from "../lib/params.ts";

/** `GET /webhook/{webhook_subscription_id}`. */
interface Input {
  webhookSubscriptionId: number;
}

const webhooksGet: ActionDefinition<Input> = {
  key: "webhooks-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook Subscription",
  description: "Fetch one webhook subscription.",
  params: [webhookIdPathParam],
  output: [{ key: "id", type: "number", label: "Webhook Subscription ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/webhook/${input.webhookSubscriptionId}`);
  },
};

export default webhooksGet;
