import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { WEBHOOK_EVENT_TYPES } from "../lib/params.ts";

interface Input {
  eventType: string;
  callbackUrl: string;
  name?: string;
}

/**
 * `POST /webhooks/` — subscribe a callback URL to one event type.
 *
 * This is per-event-type, unlike the team-wide `events_callback_url` (which receives every event
 * and is only configurable from the SignRequest UI): create one Webhook per event type a workflow
 * needs to react to.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a callback URL to one SignRequest event type.",
  idempotent: false,
  params: [
    {
      key: "eventType",
      label: "Event Type",
      type: "select",
      required: true,
      options: WEBHOOK_EVENT_TYPES.map((value) => ({ value, label: value })),
    },
    { key: "callbackUrl", label: "Callback URL", type: "string", required: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Optional label to identify what this webhook is used for.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Webhook resource URL" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/webhooks/", {
      method: "POST",
      body: compact({
        event_type: input.eventType,
        callback_url: input.callbackUrl,
        name: input.name,
      }),
    });
  },
};

export default webhookCreate;
