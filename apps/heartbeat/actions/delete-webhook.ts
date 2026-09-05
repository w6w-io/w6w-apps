import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `DELETE /v0/webhooks/{webhookID}` — delete a webhook. */
interface Input {
  webhookID: string;
}

const deleteWebhook: ActionDefinition<Input> = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook.",
  idempotent: true,
  params: [{ key: "webhookID", label: "Webhook ID", type: "string", required: true }],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/webhooks/${encodeURIComponent(input.webhookID)}`, {
      method: "DELETE",
    });
  },
};

export default deleteWebhook;
