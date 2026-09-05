import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `DELETE /v2/account/webhooks/{id}` — deletes a webhook. Paid plans only. */
interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete an account webhook by ID. Paid plans only.",
  idempotent: true,
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/account/webhooks/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
