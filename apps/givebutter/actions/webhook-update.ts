import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, toList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";
import { webhookEventOptions } from "./webhook-create.ts";

interface Input {
  id: string;
  url: string;
  events: string[] | string;
  name?: string;
  enabled?: boolean;
}

/**
 * Unlike create, update documents BOTH `url` and `events` as required — a
 * partial update (name/enabled only) is not a documented shape for this
 * endpoint, so this action asks for both up front rather than letting a
 * caller discover the 422 by omitting one.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook. Givebutter documents url and events as required on this call.",
  idempotent: true,
  params: [
    idParam("Webhook"),
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
    },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "enabled", label: "Enabled", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "events", type: "array", label: "Subscribed events" },
  ],

  async execute(input, ctx) {
    const events = toList(input.events);
    if (!events?.length) throw new Error("events is required");
    const body = compact({
      url: input.url,
      events,
      name: input.name,
      enabled: input.enabled,
    });
    return await new GivebutterClient(ctx).data(`/webhooks/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default webhookUpdate;
