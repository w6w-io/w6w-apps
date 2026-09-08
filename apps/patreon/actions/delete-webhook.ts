import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const deleteWebhook: ActionDefinition<Input> = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Delete a webhook (DELETE /webhooks/{id}). Requires the `w:campaigns.webhook` scope.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new PatreonClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default deleteWebhook;
