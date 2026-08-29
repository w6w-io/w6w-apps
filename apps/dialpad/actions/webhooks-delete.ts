import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId, stripSignatureSecret } from "../lib/client.ts";

/**
 * `DELETE /api/v2/webhooks/{id}` — delete a webhook by id.
 *
 * Deleting the webhook a subscription still names leaves that subscription
 * pointing at nothing — delete the event subscription first if you plan to
 * recreate the webhook.
 *
 * **Redacted.** See `lib/client.ts` for why `signature.secret` is stripped. A
 * delete's end state is the same however many times it runs — declared
 * idempotent.
 */
interface Input {
  webhookId: string;
}

const webhooksDelete: ActionDefinition<Input> = {
  key: "webhooks-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
  ],

  async execute(input, ctx) {
    const webhook = await new DialpadClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return stripSignatureSecret(webhook);
  },
};

export default webhooksDelete;
