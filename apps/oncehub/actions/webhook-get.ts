import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * GET /webhooks/{id}. Note the response includes `secret` (the HMAC key used
 * to verify webhook signatures) — this is the webhook's own signing secret,
 * not the caller's API key, so surfacing it here does not violate the
 * "never echo the credential" rule the auth probe follows.
 */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch a single webhook subscription by ID (GET /webhooks/{id}).",
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "events", type: "array", label: "Subscribed events" },
  ],
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/webhooks/${encodeURIComponent(input.id)}`);
  },
};

export default webhookGet;
