import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { webhookCreateParams, webhookOutputFields } from "../lib/params.ts";

const EVENT_OPTIONS = [
  { value: "call.completed", label: "Call completed" },
  { value: "call.ringing", label: "Call ringing" },
  { value: "call.recording.completed", label: "Call recording completed" },
];

/**
 * `POST /v1/webhooks/calls` — subscribe a webhook to call events.
 *
 * The legacy, generally-available endpoint. See `webhook-create-message.ts` for why this app
 * does not cover the newer beta unified webhook API, which additionally supports
 * `call.answered`, `call.forwarded`, `call.missed` and `call.voicemail.completed` (added
 * 2026-05-26) that this legacy endpoint cannot subscribe to at all.
 */
interface Input {
  events: string[];
  url: string;
  label?: string;
  resourceIds?: string[];
  userId?: string;
  status?: string;
}

const webhookCreateCall: ActionDefinition<Input> = {
  key: "webhook-create-call",
  type: "perform",
  resource: "webhook",
  title: "Create Call Webhook",
  description: "Create a webhook that triggers on call events (completed/ringing/recording " +
    "completed).",
  idempotent: false,
  params: webhookCreateParams(EVENT_OPTIONS),
  output: webhookOutputFields,

  execute(input, ctx) {
    return new QuoClient(ctx).json("/webhooks/calls", {
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

export default webhookCreateCall;
