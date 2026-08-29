import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `DELETE /webhooks/:id` — remove a webhook. */
const action: ActionDefinition = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete webhook",
  description: "Remove a webhook.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const { webhookId } = input as { webhookId: string };
    if (!webhookId) throw new Error("`webhookId` is required");
    await new OnfleetClient(ctx).request(`/webhooks/${encodeURIComponent(webhookId)}`, {
      method: "DELETE",
    });
    ctx.log("info", "deleted an Onfleet webhook", { webhookId });
    return { deleted: true };
  },
};

export default action;
