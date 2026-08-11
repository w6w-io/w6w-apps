import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
}

/**
 * `DELETE /v1/webhooks/:webhook_id` — unregister a Webhook. Answers **204**.
 *
 * "Aircall will stop sending events and configuration of the Webhook will be
 * lost" — including its authentication token, which cannot be recovered. To stop
 * deliveries temporarily without losing the registration, set `active: false`
 * with Update Webhook instead.
 */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Unregister a Webhook permanently. To pause deliveries instead, set it inactive with Update " +
    "Webhook.",
  // Same end state on a replay; a second attempt 404s.
  idempotent: true,
  params: [webhookIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("warn", "deleting webhook — its configuration and token are unrecoverable", {
      webhookId: input.webhookId,
    });
    const status = await client.status(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default webhookDelete;
