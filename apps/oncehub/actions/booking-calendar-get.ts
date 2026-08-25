import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * GET /booking-calendars/{id}. A deleted calendar is returned in *redacted*
 * mode rather than 404 — `{ id, object: "booking_calendar", deleted: true }`
 * — so callers must check the `deleted` field on the response, not just the
 * HTTP status, to know whether a calendar still exists.
 */
const bookingCalendarGet: ActionDefinition<Input> = {
  key: "booking-calendar-get",
  type: "read",
  resource: "booking-calendar",
  title: "Get Booking Calendar",
  description: "Fetch a single booking calendar by ID (GET /booking-calendars/{id}).",
  output: [
    { key: "id", type: "string", label: "Booking calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "url", type: "string", label: "URL" },
    { key: "published", type: "boolean", label: "Published" },
    { key: "duration_minutes", type: "number", label: "Duration (minutes)" },
  ],
  params: [
    { key: "id", label: "Booking calendar ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/booking-calendars/${encodeURIComponent(input.id)}`);
  },
};

export default bookingCalendarGet;
