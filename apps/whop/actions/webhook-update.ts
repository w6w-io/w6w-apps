import type { ActionDefinition } from "@w6w/types";
import { toList, WhopClient } from "../lib/client.ts";
import { webhookEventOptions, webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
  url?: string;
  events?: string[] | string;
  enabled?: boolean;
  childResourceEvents?: boolean;
  apiVersionDate?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Update a webhook's URL, subscribed events, pinned payload version, or enabled state.",
  idempotent: true,
  params: [
    webhookIdParam,
    { key: "url", label: "URL", type: "string" },
    { key: "events", label: "Events", type: "multiselect", options: webhookEventOptions },
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "childResourceEvents", label: "Include child resource events", type: "boolean" },
    {
      key: "apiVersionDate",
      label: "Pin payload version",
      type: "string",
      hint: "Only valid for v1 webhooks. Pass an empty value to unpin.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated webhook" }],

  execute(input, ctx) {
    return new WhopClient(ctx).patch(`/webhooks/${encodeURIComponent(input.webhookId)}`, {
      url: input.url,
      events: toList(input.events),
      enabled: input.enabled,
      child_resource_events: input.childResourceEvents,
      api_version_date: input.apiVersionDate,
    });
  },
};

export default webhookUpdate;
