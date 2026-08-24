import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam, webhookEventTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/robots/{robotId}/webhooks` — register a webhook on a robot.
 *
 * No idempotency key is documented for this endpoint — unlike Apify, where
 * Create Webhook is the one run-family endpoint that takes one. Calling this
 * twice with the same URL and event registers **two** webhooks, and both will
 * fire on every matching event from then on. `webhook-list` first if you need
 * to check whether an equivalent registration already exists.
 */
interface Input {
  robotId: string;
  hookUrl: string;
  eventType: string;
}

interface Output {
  id: string;
  url: string;
  webhookEvent: string;
  createdAt: number;
}

const webhookCreate: ActionDefinition<Input, Output> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook on a robot.",
  idempotent: false,
  params: [
    robotIdParam,
    {
      key: "hookUrl",
      label: "Webhook URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/v2/webhooks/callback/events",
    },
    {
      key: "eventType",
      label: "Event",
      type: "select",
      required: true,
      options: webhookEventTypeOptions,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "webhookEvent", type: "string", label: "Event" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ webhook: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/webhooks`,
      { method: "POST", body: { hookUrl: input.hookUrl, eventType: input.eventType } },
    );
    return body.webhook;
  },
};

export default webhookCreate;
