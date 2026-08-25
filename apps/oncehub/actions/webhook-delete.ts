import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** DELETE /webhooks/{id} → `{ id, deleted: true }`. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription by ID (DELETE /webhooks/{id}).",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/webhooks/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
