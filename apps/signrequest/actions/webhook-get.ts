import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/** `GET /webhooks/{uuid}/` — a webhook subscription's configuration. */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve a webhook subscription's configuration.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Webhook resource URL" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "callback_url", type: "string", label: "Callback URL" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}/`);
  },
};

export default webhookGet;
