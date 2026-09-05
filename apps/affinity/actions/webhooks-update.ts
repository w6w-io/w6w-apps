import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { webhookIdPathParam } from "../lib/params.ts";
import { webhookEventOptions } from "./webhooks-create.ts";

/**
 * `PUT /webhook/{webhook_subscription_id}` — can only be updated by its
 * creator.
 */
interface Input {
  webhookSubscriptionId: number;
  webhookUrl?: string;
  subscriptions?: string[];
  disabled?: boolean;
}

const webhooksUpdate: ActionDefinition<Input> = {
  key: "webhooks-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook Subscription",
  description: "Update a webhook subscription's URL, event types, or enabled state. Only the " +
    "creator of a subscription can update it.",
  idempotent: false,
  params: [
    webhookIdPathParam,
    { key: "webhookUrl", label: "Webhook URL", type: "string" },
    {
      key: "subscriptions",
      label: "Event types",
      type: "multiselect",
      options: webhookEventOptions,
      hint: "Leave empty to subscribe to all event types.",
    },
    {
      key: "disabled",
      label: "Disabled",
      type: "boolean",
      hint: "True disables delivery; false (re-)enables it.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Webhook Subscription ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/webhook/${input.webhookSubscriptionId}`, {
      method: "PUT",
      body: compact({
        webhook_url: input.webhookUrl,
        subscriptions: input.subscriptions,
        disabled: input.disabled,
      }),
    });
  },
};

export default webhooksUpdate;
