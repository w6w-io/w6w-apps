import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, toList } from "../lib/client.ts";

/** The 12 event types documented on `POST /v1/webhooks` and `PUT /v1/webhooks/{webhook}`. */
export const webhookEventOptions = [
  { value: "campaign.created", label: "Campaign created" },
  { value: "campaign.updated", label: "Campaign updated" },
  { value: "ticket.created", label: "Ticket created" },
  { value: "transaction.succeeded", label: "Transaction succeeded" },
  { value: "contact.created", label: "Contact created" },
  { value: "plan.canceled", label: "Plan canceled" },
  { value: "plan.created", label: "Plan created" },
  { value: "plan.failed", label: "Plan failed" },
  { value: "plan.paused", label: "Plan paused" },
  { value: "plan.resumed", label: "Plan resumed" },
  { value: "plan.updated", label: "Plan updated" },
  { value: "refund.created", label: "Refund created" },
];

interface Input {
  url: string;
  events?: string[] | string;
  name?: string;
  enabled?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook. Only url is documented required, but a webhook with no " +
    "events subscribed will never fire.",
  idempotent: false,
  params: [
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      options: webhookEventOptions,
    },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "enabled", label: "Enabled", type: "boolean", default: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "signature", type: "string", label: "Signing secret" },
    { key: "url", type: "string", label: "URL" },
  ],

  async execute(input, ctx) {
    const body = compact({
      url: input.url,
      events: toList(input.events),
      name: input.name,
      enabled: input.enabled,
    });
    return await new GivebutterClient(ctx).data("/webhooks", { method: "POST", body });
  },
};

export default webhookCreate;
