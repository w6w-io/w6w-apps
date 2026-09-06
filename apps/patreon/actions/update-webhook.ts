import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
  uri?: string;
  /** CSV of trigger names. Omit to leave unchanged. */
  triggers?: string;
  /**
   * Set to false to resume a paused webhook and flush unsent events queued
   * while it was unreachable (per the docs' explicit NOTE on this endpoint).
   */
  paused?: boolean;
}

const updateWebhook: ActionDefinition<Input> = {
  key: "update-webhook",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook created by this client (PATCH /webhooks/{id}). Requires the " +
    "`w:campaigns.webhook` scope. If the webhook has unsent events queued (its " +
    "`num_consecutive_times_failed` was > 0), setting `paused` to false replays them.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "uri", label: "Webhook URL", type: "string" },
    { key: "triggers", label: "Triggers", type: "string", hint: "CSV; omit to leave unchanged" },
    { key: "paused", label: "Paused", type: "boolean" },
  ],
  output: [{ key: "data.id", type: "string", label: "Webhook ID" }],

  execute(input, ctx) {
    const attributes: Record<string, unknown> = {};
    if (input.uri !== undefined) attributes.uri = input.uri;
    if (input.triggers !== undefined) {
      attributes.triggers = input.triggers.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (input.paused !== undefined) attributes.paused = input.paused;

    return new PatreonClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}`, {
      method: "PATCH",
      body: { id: input.webhookId, type: "webhook", attributes },
    });
  },
};

export default updateWebhook;
