import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `DELETE /v1/webhooks/:id`. */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook.",
  idempotent: true,
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Always true on success" }],

  async execute(input, ctx) {
    await new LemonSqueezyClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default webhookDelete;
