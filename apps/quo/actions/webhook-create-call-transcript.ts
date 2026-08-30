import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { webhookCreateParams, webhookOutputFields } from "../lib/params.ts";

const EVENT_OPTIONS = [{ value: "call.transcript.completed", label: "Call transcript completed" }];

/** `POST /v1/webhooks/call-transcripts` — subscribe a webhook to call-transcript completion events. */
interface Input {
  events: string[];
  url: string;
  label?: string;
  resourceIds?: string[];
  userId?: string;
  status?: string;
}

const webhookCreateCallTranscript: ActionDefinition<Input> = {
  key: "webhook-create-call-transcript",
  type: "perform",
  resource: "webhook",
  title: "Create Call Transcript Webhook",
  description: "Create a webhook that triggers when a call transcript finishes processing.",
  idempotent: false,
  params: webhookCreateParams(EVENT_OPTIONS),
  output: webhookOutputFields,

  execute(input, ctx) {
    return new QuoClient(ctx).json("/webhooks/call-transcripts", {
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

export default webhookCreateCallTranscript;
