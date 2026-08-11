import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/webhooks/{id}` — unsubscribe. Answers `204` with no body.
 *
 * Deleting is not the only way to stop deliveries: `webhook-update` with
 * `enabled: false` pauses one and keeps its id, scopes and token, which is what
 * you want during a deploy.
 *
 * Idempotent.
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription. Disable it instead to pause deliveries reversibly.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
