import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { webhookCreateParams, webhookOutputFields } from "../lib/params.ts";

const EVENT_OPTIONS = [
  { value: "message.received", label: "Message received" },
  { value: "message.delivered", label: "Message delivered" },
];

/**
 * `POST /v1/webhooks/messages` — subscribe a webhook to message events.
 *
 * This is the legacy, generally-available webhook create endpoint. Quo also has a **beta**
 * unified `POST /webhooks` (open beta since 2026-05-11) covering message/call/contact events in
 * one subscription with a different signing scheme (Standard Webhooks / Svix, `whsec_...`) — not
 * covered here, since the OpenAPI document this app was built against does not list it and a
 * beta surface's shape is not yet a stable contract. See the README's "Deliberately not covered"
 * section.
 */
interface Input {
  events: string[];
  url: string;
  label?: string;
  resourceIds?: string[];
  userId?: string;
  status?: string;
}

const webhookCreateMessage: ActionDefinition<Input> = {
  key: "webhook-create-message",
  type: "perform",
  resource: "webhook",
  title: "Create Message Webhook",
  description: "Create a webhook that triggers on message events (received/delivered).",
  idempotent: false,
  params: webhookCreateParams(EVENT_OPTIONS),
  output: webhookOutputFields,

  execute(input, ctx) {
    return new QuoClient(ctx).json("/webhooks/messages", {
      method: "POST",
      body: {
        events: input.events,
        url: input.url,
        label: input.label,
        resourceIds: input.resourceIds,
        userId: input.userId,
        status: input.status,
      },
    });
  },
};

export default webhookCreateMessage;
