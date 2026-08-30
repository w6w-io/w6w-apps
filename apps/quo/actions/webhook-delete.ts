import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `DELETE /v1/webhooks/{id}` — delete a legacy webhook by its unique identifier. Returns 204. */
interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a legacy webhook by its unique identifier.",
  idempotent: true,
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true, placeholder: "WH123abc" },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete request was accepted" },
  ],

  async execute(input, ctx) {
    await new QuoClient(ctx).json(`/webhooks/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default webhookDelete;
