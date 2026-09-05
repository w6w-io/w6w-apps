import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `GET /v1/webhooks/:id`. */
interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve a single webhook by ID.",
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The Webhook object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}`);
  },
};

export default webhookGet;
