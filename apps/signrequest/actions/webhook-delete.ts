import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/** `DELETE /webhooks/{uuid}/` — 204 No Content on success. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription.",
  idempotent: false,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new SignRequestClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}/`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default webhookDelete;
