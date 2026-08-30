import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { webhookCreateParams, webhookOutputFields } from "../lib/params.ts";

const EVENT_OPTIONS = [{ value: "call.summary.completed", label: "Call summary completed" }];

/** `POST /v1/webhooks/call-summaries` — subscribe a webhook to call-summary completion events. */
interface Input {
  events: string[];
  url: string;
  label?: string;
  resourceIds?: string[];
  userId?: string;
  status?: string;
}

const webhookCreateCallSummary: ActionDefinition<Input> = {
  key: "webhook-create-call-summary",
  type: "perform",
  resource: "webhook",
  title: "Create Call Summary Webhook",
  description: "Create a webhook that triggers when a call summary finishes generating.",
  idempotent: false,
  params: webhookCreateParams(EVENT_OPTIONS),
  output: webhookOutputFields,

  execute(input, ctx) {
    return new QuoClient(ctx).json("/webhooks/call-summaries", {
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

export default webhookCreateCallSummary;
