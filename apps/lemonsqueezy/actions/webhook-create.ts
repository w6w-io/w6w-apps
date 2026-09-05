import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient, relationshipRef } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

/**
 * `POST /v1/webhooks` — `url`, `events` and `secret` are all required.
 *
 * `secret` is write-only: the vendor's docs state it plainly — "The `secret`
 * is never returned in the API. To view the secret of a webhook, open the
 * webhook in your dashboard." — so it must be recorded by whoever configures
 * this action; there is no way to read it back afterward.
 */
interface Input {
  storeId: string;
  url: string;
  events: string[] | string;
  secret: string;
  testMode?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook endpoint for a store.",
  idempotent: false,
  params: [
    { key: "storeId", label: "Store ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
    },
    {
      key: "secret",
      label: "Signing secret",
      type: "secret",
      required: true,
      hint: "Lemon Squeezy signs each delivery with this. It is never returned by the API again " +
        "— keep your own copy.",
    },
    { key: "testMode", label: "Test mode only", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The created Webhook object" }],

  execute(input, ctx) {
    const events = Array.isArray(input.events)
      ? input.events
      : String(input.events).split(",").map((s) => s.trim()).filter(Boolean);

    return new LemonSqueezyClient(ctx).request("/webhooks", {
      method: "POST",
      body: jsonApiBody(
        "webhooks",
        { url: input.url, events, secret: input.secret, test_mode: input.testMode },
        { store: relationshipRef("stores", input.storeId) },
      ),
    });
  },
};

export default webhookCreate;
