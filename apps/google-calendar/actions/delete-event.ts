import type { ActionDefinition } from "@w6w/types";
import { encodeCalendarId, GoogleCalendarClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  eventId: string;
  sendUpdates?: "all" | "externalOnly" | "none";
}

/**
 * `events.delete` — https://developers.google.com/calendar/v3/reference/events/delete
 *
 * The API returns 204 No Content; the client normalises that to `undefined`,
 * so we return a `{ success: true }` sentinel — matching n8n's behaviour.
 */
const deleteEvent: ActionDefinition<Input, { success: true }> = {
  key: "delete-event",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Delete an event by ID.",
  idempotent: true,
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
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
    await client.request<void>(
      `/calendars/${encodeCalendarId(input.calendarId)}/events/${input.eventId}`,
      {
        method: "DELETE",
        query: { sendUpdates: input.sendUpdates },
      },
    );
    return { success: true };
  },
};

export default deleteEvent;
