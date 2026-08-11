import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, stripWebhookSecret } from "../lib/client.ts";

/**
 * `GET /v2/webhooks/{id}` — one webhook subscription.
 *
 * The signing `token` is deleted before this returns, for the same reason it is
 * stripped from the list: it is a live credential for forging deliveries, and a
 * workflow result outlives the call. The person who created the webhook chose
 * that value and already has it.
 */
interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Retrieve Webhook",
  description: "Fetch one webhook. The signing token is removed before it is returned.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "scopes", type: "array", label: "Event scopes" },
    { key: "enabled", type: "boolean", label: "Enabled" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx)
      .json(`/webhooks/${encodeId(input.webhookId)}`)
      .then(stripWebhookSecret);
  },
};

export default webhookGet;
