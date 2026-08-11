import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/webhooks/{webhookId}` — remove a webhook.
 *
 * Answers `204` with no body, so there is nothing to unwrap and nothing to
 * return but the status.
 *
 * Idempotent in the sense the runtime cares about: the end state after one call
 * and after five is the same webhook gone. A repeat call on an already-deleted
 * id answers `404 record-not-found`, which surfaces as an error rather than
 * being swallowed — a 404 here is worth seeing, because it usually means the id
 * was wrong rather than that the work was already done.
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "From the `id` of a Create Webhook or List Webhooks result.",
    },
  ],
  output: [
    { key: "webhookId", type: "string", label: "Webhook deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new ApifyClient(ctx).status(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return { webhookId: input.webhookId, status };
  },
};

export default webhookDelete;
