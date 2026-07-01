import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  eventId: string;
  timeZone?: string;
  maxAttendees?: number;
}

/**
 * `events.get` — https://developers.google.com/calendar/v3/reference/events/get
 */
const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Retrieve a single event by ID.",
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "timeZone", label: "Time zone", type: "string" },
    { key: "maxAttendees", label: "Max attendees", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    return client.request(
      `/calendars/${encodeCalendarId(input.calendarId)}/events/${input.eventId}`,
      {
        query: {
          timeZone: input.timeZone,
          maxAttendees: input.maxAttendees,
        },
      },
    );
  },
};

export default getEvent;
