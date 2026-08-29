import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/webhooks/{id}` — delete an account-wide webhook.
 *
 * `idempotent: true`: the end state (webhook gone) is the same no matter how many times
 * this is called.
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete an account-wide webhook.",
  idempotent: true,
  params: [webhookIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting CloudConvert webhook", { webhookId: input.webhookId });
    const status = await new CloudConvertClient(ctx).status(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 204 };
  },
};

export default webhookDelete;
