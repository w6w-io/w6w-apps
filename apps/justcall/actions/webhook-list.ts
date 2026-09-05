import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";
import { toSelectOptions, WEBHOOK_EVENT_TYPES } from "../lib/params.ts";

/** `GET /v2.1/webhooks` — verified against `webhook_list_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  type?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description:
    "Retrieve every event type with any subscribed URL, or filter to one event type and see its " +
    "subscribed URLs.",
  params: [
    {
      key: "type",
      label: "Event type",
      type: "select",
      options: toSelectOptions(WEBHOOK_EVENT_TYPES),
    },
  ],
  output: [
    { key: "data", type: "array", label: "One entry per event type, each with its webhook_urls" },
    { key: "total_count", type: "number", label: "Total events fetched" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/webhooks", {
      query: { type: input.type },
    });
    return body;
  },
};

export default webhookList;
