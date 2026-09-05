import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { webhookIdPathParam } from "../lib/params.ts";

/**
 * `DELETE /webhook/{webhook_subscription_id}` — can only be deleted by its
 * creator or an admin.
 */
interface Input {
  webhookSubscriptionId: number;
}

const webhooksDelete: ActionDefinition<Input> = {
  key: "webhooks-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Subscription",
  description: "Delete a webhook subscription. Only its creator or an admin can delete it.",
  idempotent: true,
  params: [webhookIdPathParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/webhook/${input.webhookSubscriptionId}`);
  },
};

export default webhooksDelete;
