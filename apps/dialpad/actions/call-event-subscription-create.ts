import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, stripSignatureSecret } from "../lib/client.ts";
import { callStateOptions, targetTypeOptions, toStringArray } from "../lib/params.ts";

/**
 * `POST /api/v2/subscriptions/call` — subscribe an existing webhook to call
 * events.
 *
 * A webhook (create one with `webhooks-create`) is the delivery destination;
 * a call event subscription is what tells Dialpad *which* call state changes
 * to send it, optionally narrowed to one target. One webhook id can back
 * several subscriptions.
 *
 * **Redacted.** The response embeds the full `webhook` object, including
 * `signature.secret` — see `lib/client.ts`. Stripped before this action
 * returns.
 *
 * No idempotency key is documented, so calling this twice with the same
 * webhook and states creates two subscriptions, each independently delivering
 * the same events.
 */
interface Input {
  endpointId: string;
  callStates?: string;
  targetType?: string;
  targetId?: string;
  groupCallsOnly?: boolean;
  enabled?: boolean;
}

const callEventSubscriptionCreate: ActionDefinition<Input> = {
  key: "call-event-subscription-create",
  type: "perform",
  resource: "call-event-subscription",
  title: "Create Call Event Subscription",
  description:
    "Subscribe a webhook to call state events, optionally scoped to one target (office, " +
    "department, call center, user, ...).",
  idempotent: false,
  params: [
    {
      key: "endpointId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "The webhook that should receive these events. Create one with Create Webhook.",
    },
    {
      key: "callStates",
      label: "Call states",
      type: "multiselect",
      options: callStateOptions,
      hint: 'Leave empty for Dialpad\'s own default set. Choose "All states" for everything.',
    },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: targetTypeOptions,
      hint: "Scope events to one target instead of the whole company.",
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      hint: "Required whenever Target type is set.",
    },
    {
      key: "groupCallsOnly",
      label: "Group calls only",
      type: "boolean",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      default: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "call_states", type: "array", label: "Call states" },
  ],

  async execute(input, ctx) {
    const subscription = await new DialpadClient(ctx).json("/subscriptions/call", {
      method: "POST",
      body: {
        endpoint_id: Number(input.endpointId),
        call_states: toStringArray(input.callStates),
        target_type: input.targetType,
        target_id: input.targetId ? Number(input.targetId) : undefined,
        group_calls_only: input.groupCallsOnly,
        enabled: input.enabled,
      },
    }) as { webhook?: unknown; [key: string]: unknown };
    return subscription.webhook
      ? { ...subscription, webhook: stripSignatureSecret(subscription.webhook) }
      : subscription;
  },
};

export default callEventSubscriptionCreate;
