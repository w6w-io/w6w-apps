import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch a single webhook by id.",
  params: [idParam("Webhook")],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "last_status", type: "string", label: "Last delivery status" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/webhooks/${encodeURIComponent(input.id)}`);
  },
};

export default webhookGet;
