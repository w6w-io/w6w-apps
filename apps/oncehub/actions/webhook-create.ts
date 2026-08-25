import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  name: string;
  url: string;
  events: string[];
}

/**
 * POST /webhooks. `name` must be unique per account (409 on a duplicate).
 * The 10 documented event types, verified against the spec's `webhooks:`
 * (webhook payload) section:
 * https://help.oncehub.com/developers/webhooks/introduction-to-webhooks/
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Create a webhook subscription (POST /webhooks).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "events", type: "array", label: "Subscribed events" },
    { key: "secret", type: "string", label: "Signing secret" },
  ],
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Must be unique per account.",
    },
    { key: "url", label: "Target URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: [
        { label: "Booking scheduled", value: "booking.scheduled" },
        { label: "Booking rescheduled", value: "booking.rescheduled" },
        { label: "Booking reassigned", value: "booking.reassigned" },
        { label: "Booking canceled then rescheduled", value: "booking.canceled_then_rescheduled" },
        {
          label: "Booking canceled, reschedule requested",
          value: "booking.canceled_reschedule_requested",
        },
        { label: "Booking canceled", value: "booking.canceled" },
        { label: "Booking completed", value: "booking.completed" },
        { label: "Booking no-show", value: "booking.no_show" },
        { label: "Conversation started", value: "conversation.started" },
        { label: "Conversation closed", value: "conversation.closed" },
      ],
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/webhooks", {
      method: "POST",
      body: { name: input.name, url: input.url, events: input.events },
    });
  },
};

export default webhookCreate;
