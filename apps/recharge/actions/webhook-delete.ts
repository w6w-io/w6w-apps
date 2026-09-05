import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/**
 * `DELETE /webhooks/{id}` — delete a webhook.
 *
 * Idempotent in the sense the runtime cares about: the end state after one
 * call and after five is the same webhook gone. A repeat call on an
 * already-deleted id answers `404 {"error": "..."}`, which surfaces as an
 * error rather than being swallowed — worth seeing, since it usually means
 * the id was already wrong rather than that the work was already done.
 */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a registered webhook.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const status = await client.status(`/webhooks/${encodeURIComponent(input.webhookId)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default webhookDelete;
