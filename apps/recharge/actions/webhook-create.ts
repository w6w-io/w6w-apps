import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { webhookTopicOptions } from "../lib/params.ts";

interface Input {
  address: string;
  topic: string;
  includedObjects?: string[];
}

/**
 * `POST /webhooks` — register a webhook. To register for topic `X/created`
 * you need the matching `read_X` scope on the token, per the reference (e.g.
 * `subscription/created` needs `read_subscriptions`) — see the "Available
 * webhooks" table in this app's README for the full topic-to-scope mapping.
 * Each token may register at most 10 webhooks of the same topic.
 *
 * `checkout/completed` is documented deprecated but "will not be removed
 * from this API version" — kept in the topic list for that reason.
 *
 * Response envelope: `{"webhook": {...}}`.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook endpoint for a Recharge event.",
  idempotent: false,
  params: [
    {
      key: "address",
      label: "Endpoint URL",
      type: "string",
      required: true,
      hint: "Where Recharge sends the POST request when the event occurs.",
    },
    {
      key: "topic",
      label: "Topic",
      type: "select",
      required: true,
      options: webhookTopicOptions,
    },
    {
      key: "includedObjects",
      label: "Included objects",
      type: "multiselect",
      options: [
        { value: "addresses", label: "Addresses" },
        { value: "collections", label: "Collections" },
        { value: "customer", label: "Customer" },
        { value: "metafields", label: "Metafields" },
      ],
      hint: "Objects to enrich the webhook payload with.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "address", type: "string", label: "Endpoint URL" },
    { key: "topic", type: "string", label: "Topic" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single("/webhooks", "webhook", {
      method: "POST",
      body: compact({
        address: input.address,
        topic: input.topic,
        included_objects: input.includedObjects,
      }),
    });
  },
};

export default webhookCreate;
