import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type Webhook, type WebhookCreateResponse } from "../lib/client.ts";

interface Input {
  url: string;
}

/**
 * `POST /v2/webhook.create` — register an HTTPS endpoint to receive task
 * event notifications, an alternative to polling `task-list-messages`. See
 * `webhook-public-key` to verify a notification's signature.
 *
 * API-key only per the vendor's schema — this app implements only API-key
 * Auth, so that restriction never applies here.
 *
 * `idempotent: false`: Manus documents no uniqueness constraint on the URL,
 * so a retry registers a second, separate webhook.
 */
const webhookCreate: ActionDefinition<Input, Webhook> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register an HTTPS endpoint to receive task event notifications.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Endpoint URL",
      type: "string",
      required: true,
      hint: "Must be HTTPS, publicly reachable, and return a 2xx status.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Endpoint URL" },
    { key: "status", type: "string", label: "active | inactive" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<WebhookCreateResponse>("/v2/webhook.create", {
      method: "POST",
      body: { url: input.url },
    });
    return res.webhook;
  },
};

export default webhookCreate;
