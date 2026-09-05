import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type Webhook, type WebhookListResponse } from "../lib/client.ts";

/** `GET /v2/webhook.list` — every webhook registered on the account. */
const webhookList: ActionDefinition<Record<string, never>, Webhook[]> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all webhooks registered on the account.",
  params: [],
  output: [{ key: "", type: "array", label: "Webhooks" }],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<WebhookListResponse>("/v2/webhook.list");
    return res.data;
  },
};

export default webhookList;
