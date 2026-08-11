import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId, stripWebhookToken } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
}

/**
 * `GET /v1/webhooks/:webhook_id` — one Webhook.
 *
 * The `token` — the shared secret a receiver authenticates Aircall's deliveries
 * with — is stripped before this returns, for the same reason as in List
 * Webhooks: a step's result is persisted and re-rendered, and this is the one
 * field on a Webhook that is a live credential. Create Webhook is where it is
 * issued and where this app returns it.
 *
 * The legacy numeric webhook id is still accepted in this path, which is how a
 * stored pre-UUID id is migrated: pass the old id, read `webhook_id` off the
 * response.
 */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Retrieve Webhook",
  description:
    "Fetch one Webhook by UUID (or by its legacy numeric ID). The shared authentication token is " +
    "stripped.",
  params: [webhookIdParam],
  output: [
    { key: "webhook_id", type: "string", label: "Webhook UUID" },
    { key: "url", type: "string", label: "Delivery URL" },
    { key: "active", type: "boolean", label: "False once Aircall auto-deactivated it" },
    { key: "events", type: "array", label: "Subscribed event names" },
    { key: "created_at", type: "string", label: "ISO 8601 timestamp" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const webhook = await client.entity<Record<string, unknown>>(
      `/webhooks/${encodeId(input.webhookId)}`,
      "webhook",
    );
    return stripWebhookToken(webhook);
  },
};

export default webhookGet;
