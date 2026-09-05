import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { WEBHOOK_EVENT_TYPES } from "../lib/params.ts";

interface Input {
  webhookId: string;
  eventType?: string;
  callbackUrl?: string;
  name?: string;
}

/**
 * `PATCH /webhooks/{uuid}/` — partially update a webhook subscription. SignRequest also documents
 * `PUT` (full replace, requiring `event_type`+`callback_url`); this action uses `PATCH` so a single
 * field can be changed without resending the rest.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Change a webhook subscription's event type, callback URL, or name.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    {
      key: "eventType",
      label: "Event Type",
      type: "select",
      options: WEBHOOK_EVENT_TYPES.map((value) => ({ value, label: value })),
    },
    { key: "callbackUrl", label: "Callback URL", type: "string" },
    { key: "name", label: "Name", type: "string" },
  ],
  output: [
    { key: "uuid", type: "string", label: "Webhook ID" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "callback_url", type: "string", label: "Callback URL" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}/`, {
      method: "PATCH",
      body: compact({
        event_type: input.eventType,
        callback_url: input.callbackUrl,
        name: input.name,
      }),
    });
  },
};

export default webhookUpdate;
