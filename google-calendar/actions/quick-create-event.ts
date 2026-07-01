import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  text: string;
  sendUpdates?: "all" | "externalOnly" | "none";
}

/**
 * `events.quickAdd` — https://developers.google.com/calendar/v3/reference/events/quickAdd
 *
 * Creates an event from a natural-language string (Google parses it):
 *   `Appointment at Somewhere on June 3rd 10am-10:25am`
 */
const quickCreateEvent: ActionDefinition<Input> = {
  key: "quick-create-event",
  type: "perform",
  resource: "event",
  title: "Quick Create Event",
  description: "Create an event from a natural-language string via `events.quickAdd`.",
  idempotent: false,
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    {
      key: "text",
      label: "Description",
      type: "string",
      required: true,
      hint: "e.g. `Coffee with Sam tomorrow at 3pm`.",
    },
    {
      key: "sendUpdates",
      label: "Send updates",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "externalOnly", label: "External only" },
        { value: "none", label: "None" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleCalendarClient(ctx);
    return client.request(
      `/calendars/${encodeCalendarId(input.calendarId)}/events/quickAdd`,
      {
        method: "POST",
        query: {
          text: input.text,
          sendUpdates: input.sendUpdates,
        },
      },
    );
  },
};

export default quickCreateEvent;
