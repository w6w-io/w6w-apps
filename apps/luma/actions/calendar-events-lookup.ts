import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";

interface Input {
  platform?: "external" | "luma";
  url?: string;
  eventId?: string;
}

/**
 * `GET /v1/calendars/events/lookup` — find where an event stands on THIS
 * calendar: approved, pending, or rejected. Not the same question as
 * `event-get`, which reads the event's own detail regardless of any
 * calendar's submission state.
 */
const calendarEventsLookup: ActionDefinition<Input> = {
  key: "calendar-events-lookup",
  type: "read",
  resource: "event",
  title: "Lookup Calendar Event Submission",
  description:
    "Look up an event's submission status (approved/pending/rejected) on the connected calendar, " +
    "by Luma event ID or by external URL.",
  params: [
    {
      key: "platform",
      label: "Platform",
      type: "select",
      options: [
        { value: "luma", label: "Luma" },
        { value: "external", label: "External" },
      ],
    },
    { key: "url", label: "External URL", type: "string" },
    { key: "eventId", label: "Event", type: "string", placeholder: "evt-abc123" },
  ],
  output: [{ key: "event", type: "object", label: "Calendar event submission" }],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/calendars/events/lookup", {
      query: compact({
        platform: input.platform,
        url: input.url,
        event_id: input.eventId,
      }),
    });
  },
};

export default calendarEventsLookup;
