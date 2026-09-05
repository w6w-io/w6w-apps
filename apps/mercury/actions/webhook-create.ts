import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `POST /webhooks` — register a new webhook endpoint. Only `url` is
 * required; `eventTypes` (omit to subscribe to all) and `filterPaths` (omit
 * for no filtering) are both optional per the OpenAPI document.
 */
interface Input {
  url: string;
  eventTypes?: string[];
}

const WEBHOOK_EVENT_TYPES = [
  "transaction.created",
  "transaction.updated",
  "checkingAccount.balance.updated",
  "savingsAccount.balance.updated",
  "treasuryAccount.balance.updated",
  "investmentAccount.balance.updated",
  "creditAccount.balance.updated",
];

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Endpoint",
  description:
    "Register a new webhook endpoint. Leave event types empty to subscribe to all events.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "The URL Mercury will deliver webhook events to.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      hint: "Leave empty to subscribe to every event type.",
      options: WEBHOOK_EVENT_TYPES.map((v) => ({ value: v, label: v })),
    },
  ],
  output: [{ key: "webhook", type: "object", label: "Created webhook endpoint" }],

  async execute(input, ctx) {
    const webhook = await new MercuryClient(ctx).json("/webhooks", {
      method: "POST",
      body: {
        url: input.url,
        eventTypes: input.eventTypes && input.eventTypes.length > 0 ? input.eventTypes : undefined,
      },
    });
    return { webhook };
  },
};

export default webhookCreate;
