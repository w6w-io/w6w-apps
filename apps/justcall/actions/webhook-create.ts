import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient } from "../lib/client.ts";
import { toSelectOptions, WEBHOOK_EVENT_TYPES } from "../lib/params.ts";

/**
 * `POST /v2.1/webhooks` — verified against `webhook_create_v21`'s OpenAPI
 * fragment, 2026-09-05.
 *
 * Adds a URL subscription to an event type — JustCall webhooks are keyed by
 * event type first, with one or more URLs subscribed under each.
 */
interface Input {
  type: string;
  webhook_url: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Add Webhook URL",
  description: "Subscribe a URL to a JustCall webhook event type.",
  // The vendor documents no dedupe: re-adding the same URL to the same event
  // is left to the caller to avoid sending duplicate subscriptions.
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Event type",
      type: "select",
      options: toSelectOptions(WEBHOOK_EVENT_TYPES),
      required: true,
    },
    { key: "webhook_url", label: "Webhook URL", type: "string", required: true },
  ],
  output: [
    { key: "type", type: "string", label: "Event type" },
    { key: "webhook_urls", type: "array", label: "URLs now subscribed to this event" },
    { key: "url_count", type: "number", label: "Total URLs subscribed" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/webhooks", {
      method: "POST",
      body: compact({ type: input.type, webhook_url: input.webhook_url }),
    });
  },
};

export default webhookCreate;
