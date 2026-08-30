import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Permanently delete a webhook endpoint.",
  idempotent: true,
  params: [webhookIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted webhook ID" },
    { key: "deleted", type: "boolean", label: "Always true" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).delete(`/webhooks/${encodeURIComponent(input.webhookId)}`);
  },
};

export default webhookDelete;
