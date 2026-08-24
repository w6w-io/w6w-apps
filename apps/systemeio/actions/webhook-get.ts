import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve a single Webhook resource by id.",
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "subscriptions", type: "array", label: "Subscribed events" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(`/api/webhooks/${encodeURIComponent(input.id)}`);
  },
};

export default webhookGet;
