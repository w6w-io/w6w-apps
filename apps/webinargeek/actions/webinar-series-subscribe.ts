import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";
import { subscriptionBaseBody, subscriptionBaseParams } from "../lib/params.ts";

/**
 * `POST /webinars/{id}/series_subscribe` — subscribe one end-user to exactly one broadcast of
 * every episode in a webinar series, in a single call.
 *
 * Fails outright — creating NO subscriptions — if any one episode has no subscribable broadcast
 * left (all in the past, or all at the webinar's subscriber cap). Just-in-time broadcasts are not
 * supported by this endpoint.
 *
 * Re-subscribing someone already subscribed to a broadcast in the series is silently skipped
 * rather than erroring or duplicating — per the vendor's own docs, "trying to create a
 * subscription for a user to a broadcast which they are already subscribed to, will silently
 * skip the subscription" — which is why this action is safe to retry.
 */
interface Input {
  webinarId: number;
  broadcasts?: number[];
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

const webinarSeriesSubscribe: ActionDefinition<Input> = {
  key: "webinar-series-subscribe",
  type: "perform",
  resource: "webinar",
  title: "Subscribe to Webinar Series",
  description:
    "Register a subscriber for one broadcast of every episode in a webinar series at once.",
  // Re-subscribing an already-subscribed broadcast is a documented no-op, not a duplicate.
  idempotent: true,
  params: [
    { key: "webinarId", label: "Webinar ID", type: "number", required: true },
    {
      key: "broadcasts",
      label: "Broadcast IDs",
      type: "array",
      item: { type: "number" },
      advanced: true,
      hint: "Optional: exactly one broadcast ID per episode, to pick specific sessions instead " +
        "of WebinarGeek's own default selection.",
    },
    ...subscriptionBaseParams(),
  ],
  output: [
    { key: "total_count", type: "number", label: "Subscriptions created" },
    { key: "subscriptions", type: "array", label: "Created subscriptions" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/webinars/${input.webinarId}/series_subscribe`, {
      method: "POST",
      body: { ...subscriptionBaseBody(input), broadcasts: input.broadcasts },
    });
  },
};

export default webinarSeriesSubscribe;
