import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
}

/**
 * `POST /v1/events/cancel/request` — step 1 of cancellation.
 *
 * Returns a `cancellation_token` that expires after 15 minutes, plus
 * `is_paid` and `guest_count` so the caller can decide whether `should_refund`
 * is needed before confirming with `event-cancel`. Cancelling is
 * deliberately two calls, not one, in Luma's own design — this app mirrors
 * that rather than collapsing it, since a single "cancel" call cannot both
 * ask for confirmation and act on it.
 */
const eventCancelRequest: ActionDefinition<Input> = {
  key: "event-cancel-request",
  type: "perform",
  resource: "event",
  title: "Request Event Cancellation",
  description:
    "Start cancelling an event. Returns a short-lived cancellation_token (15 minutes) plus " +
    "whether the event has paid guests — pass both to Confirm Event Cancellation.",
  idempotent: false,
  params: [eventIdParam],
  output: [
    { key: "cancellation_token", type: "string", label: "Cancellation token" },
    { key: "is_paid", type: "boolean", label: "Has paid guests" },
    { key: "guest_count", type: "number", label: "Approved guest count" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/cancel/request", {
      method: "POST",
      body: { event_id: input.eventId },
    });
  },
};

export default eventCancelRequest;
