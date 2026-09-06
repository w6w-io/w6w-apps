import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";
import { subscriptionBaseBody, subscriptionBaseParams } from "../lib/params.ts";

/**
 * `POST /broadcasts/{id}/subscriptions` — subscribe an end-user to one broadcast.
 *
 * Unlike `webinar-series-subscribe`, the spec does not document a silent-skip for a broadcast
 * someone is already subscribed to, so this action is marked non-idempotent rather than assumed
 * safe to retry.
 *
 * Subscribing to a just-in-time broadcast (`active_jit: true`) creates a real, dated broadcast on
 * the fly for the next available slot; the response's own `broadcast` object reflects the
 * newly-created one, not the virtual JIT placeholder that was passed in.
 */
interface Input {
  broadcastId: number;
  firstname: string;
  email: string;
  surname?: string;
  company?: string;
  jobTitle?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  postcode?: string;
  province?: string;
  country?: string;
  phone?: string;
  externalId?: string;
  timeZone?: string;
  customField?: string;
  extraFields?: Record<string, unknown>;
  consentFields?: Record<string, unknown>;
  skipConfirmationMail?: boolean;
}

const broadcastSubscribe: ActionDefinition<Input> = {
  key: "broadcast-subscribe",
  type: "perform",
  resource: "broadcast",
  title: "Subscribe to Broadcast",
  description: "Register a subscriber for a single broadcast.",
  idempotent: false,
  params: [
    { key: "broadcastId", label: "Broadcast ID", type: "number", required: true },
    ...subscriptionBaseParams(),
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "watch_link", type: "string", label: "Watch link" },
    { key: "confirmation_link", type: "string", label: "Confirmation link" },
    { key: "broadcast", type: "object", label: "Broadcast" },
    { key: "episode", type: "object", label: "Episode" },
    { key: "webinar", type: "object", label: "Webinar" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/broadcasts/${input.broadcastId}/subscriptions`, {
      method: "POST",
      body: subscriptionBaseBody(input),
    });
  },
};

export default broadcastSubscribe;
