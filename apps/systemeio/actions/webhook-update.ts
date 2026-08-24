import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

interface SubscriptionInput {
  event: string;
  schemaVersion?: number;
}

interface Input {
  id: string;
  name?: string;
  secret?: string;
  subscriptions?: SubscriptionInput[];
  active?: boolean;
}

/**
 * `PATCH /api/webhooks/{id}` — merge-patch. Unlike creation, `url` is not
 * settable here: the vendor's own update schema
 * (`Webhook.UpdateWebhookInput`) has no `url` property at all.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Update a Webhook's name, signing secret, subscriptions and/or active state. The target URL " +
    "cannot be changed — the vendor's own update schema has no url property.",
  idempotent: true,
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "secret", label: "Signing secret", type: "secret" },
    {
      key: "subscriptions",
      label: "Subscribed events",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "event",
            label: "Event",
            type: "select",
            required: true,
            options: webhookEventOptions,
          },
          { key: "schemaVersion", label: "Schema version", type: "number", default: 2 },
        ],
      },
    },
    { key: "active", label: "Active", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "subscriptions", type: "array", label: "Subscribed events" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).patch(
      `/api/webhooks/${encodeURIComponent(input.id)}`,
      compact({
        name: input.name,
        secret: input.secret,
        subscriptions: input.subscriptions,
        active: input.active,
      }),
    );
  },
};

export default webhookUpdate;
