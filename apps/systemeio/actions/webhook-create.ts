import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { webhookSubscriptionsParam } from "../lib/params.ts";

interface SubscriptionInput {
  event: string;
  schemaVersion?: number;
}

interface Input {
  name: string;
  url: string;
  secret: string;
  subscriptions: SubscriptionInput[];
  active?: boolean;
}

/**
 * `POST /api/webhooks`. `name`, `secret`, `url` and `subscriptions` are all
 * `required` in the OpenAPI schema. `secret` is the value systeme.io signs
 * webhook payloads with (an HMAC secret the receiver verifies), so it is
 * declared `type: "secret"` here even though the vendor's own field name is
 * plain `secret` rather than something obviously credential-shaped.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a Webhook that systeme.io calls when a subscribed event fires.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 255 } },
    { key: "url", label: "Target URL", type: "string", required: true },
    {
      key: "secret",
      label: "Signing secret",
      type: "secret",
      required: true,
      hint: "systeme.io signs delivered payloads with this — verify it on receipt.",
    },
    webhookSubscriptionsParam,
    { key: "active", label: "Active", type: "boolean", default: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "subscriptions", type: "array", label: "Subscribed events" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post(
      "/api/webhooks",
      compact({
        name: input.name,
        url: input.url,
        secret: input.secret,
        subscriptions: input.subscriptions,
        active: input.active,
      }),
    );
  },
};

export default webhookCreate;
