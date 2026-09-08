import type { ActionDefinition } from "@w6w/types";
import { encodeLeadId, yelpRequest } from "../lib/client.ts";

interface Input {
  leadId: string;
  eventId: string;
  timeRead?: string;
}

/**
 * `POST /v3/leads/{ID}/events/mark_as_read` — mark one event, and every event
 * before it, as read. `time_read` is optional (RFC 3339); Yelp uses "now"
 * when it is omitted.
 *
 * Marked idempotent: unlike `write-lead-event` and `mark-lead-as-replied`,
 * Yelp's OpenAPI document lists no "already marked as read" error for this
 * endpoint — re-marking the same (or an earlier) event as read is a
 * documented no-op, not a rejected retry.
 */
const markLeadEventAsRead: ActionDefinition<Input> = {
  key: "mark-lead-event-as-read",
  type: "perform",
  resource: "lead",
  title: "Mark Lead Event as Read",
  description: "Mark a lead event, and every event before it, as read.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "Mark this event, and every event before it in the conversation, as read.",
    },
    {
      key: "timeRead",
      label: "Read at",
      type: "datetime",
      hint: "When the event was read. Defaults to the current time when left blank.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return yelpRequest(ctx, `/leads/${encodeLeadId(input.leadId)}/events/mark_as_read`, {
      method: "POST",
      body: {
        event_id: input.eventId,
        ...(input.timeRead ? { time_read: input.timeRead } : {}),
      },
    });
  },
};

export default markLeadEventAsRead;
