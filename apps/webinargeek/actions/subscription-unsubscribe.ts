import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/**
 * `POST /subscriptions/{id}/unsubscribe` — unsubscribe a subscriber from their broadcast; they
 * can no longer view it and receive no further emails. Re-subscribing creates a brand new
 * subscription rather than reactivating this one.
 *
 * Treated as idempotent: unsubscribing an already-unsubscribed subscriber reaches the same end
 * state (`unsubscribed: true`) rather than erroring or double-unsubscribing.
 */
interface Input {
  id: number;
}

const subscriptionUnsubscribe: ActionDefinition<Input> = {
  key: "subscription-unsubscribe",
  type: "perform",
  resource: "subscription",
  title: "Unsubscribe Subscriber",
  description: "Unsubscribe a subscriber from their broadcast.",
  idempotent: true,
  params: [
    { key: "id", label: "Subscription ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
    { key: "unsubscribed_at", type: "number", label: "Unsubscribed at (Unix timestamp)" },
    { key: "unsubscription_source", type: "string", label: "Unsubscription source" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/subscriptions/${input.id}/unsubscribe`, {
      method: "POST",
    });
  },
};

export default subscriptionUnsubscribe;
