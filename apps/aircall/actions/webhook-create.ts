import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact, toList } from "../lib/client.ts";

interface Input {
  url: string;
  customName?: string;
  events?: string[] | string;
}

/**
 * `POST /v1/webhooks` — register a delivery URL. Answers **201** with the new
 * Webhook.
 *
 * **This is the one action that returns the `token`, deliberately.** Aircall
 * issues that shared secret here and nowhere else: it is what the receiving
 * server checks to decide an inbound delivery really came from Aircall, and
 * there is no rotate endpoint and no way to re-read it — List Webhooks and
 * Retrieve Webhook both strip it, because a bulk read of secrets belonging to
 * webhooks this step never created is a leak, while the one being issued to the
 * caller right now is the point of the call. If it is lost, delete the webhook
 * and create another.
 *
 * **Leaving `events` empty subscribes to everything.** Aircall: "If events field
 * is empty, all events will be attached to this webhook." That is roughly ninety
 * event types across calls, users, numbers, messages, contacts, conversation
 * intelligence and analytics — a firehose, and the default. Name the events you
 * want.
 *
 * A company may hold at most 100 Webhooks; the 101st create fails with a 400.
 * Aircall also auto-deactivates a webhook whose endpoint keeps failing, which is
 * what Update Webhook's `active` flag is for.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register a URL to receive Aircall events, and get back the token used to authenticate " +
    "deliveries. Leaving events empty subscribes to ALL of them.",
  // Not retryable: no idempotency key and no upsert, so a replay registers a
  // second webhook against the same URL and every event is then delivered twice.
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Delivery URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/webhooks/aircall",
      hint: "Must be a valid, reachable URL. Aircall deactivates endpoints that keep failing.",
    },
    {
      key: "customName",
      label: "Name",
      type: "string",
      placeholder: "My Custom Workflow",
      hint: "Defaults to `Webhook`.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      hint:
        "Event names such as `call.created`, `call.ended`, `contact.updated`. LEAVE THIS EMPTY " +
        "AND AIRCALL SUBSCRIBES TO EVERY EVENT — around ninety of them.",
    },
  ],
  output: [
    { key: "webhook_id", type: "string", label: "Webhook UUID" },
    { key: "url", type: "string", label: "Delivery URL" },
    { key: "events", type: "array", label: "Subscribed event names" },
    {
      key: "token",
      type: "string",
      label: "Shared secret for verifying deliveries — returned ONLY here, and never again",
    },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const events = toList(input.events);
    if (!events) {
      ctx.log(
        "warn",
        "creating an Aircall webhook with no event filter — it will receive every event type",
        { url: input.url },
      );
    }
    return await client.entity("/webhooks", "webhook", {
      method: "POST",
      body: compact({ url: input.url, custom_name: input.customName, events }),
    });
  },
};

export default webhookCreate;
