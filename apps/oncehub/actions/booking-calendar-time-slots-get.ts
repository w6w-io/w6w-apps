import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  startTime?: string;
  endTime?: string;
}

/**
 * GET /booking-calendars/{id}/time-slots — available slots for a published
 * calendar. All datetimes are full ISO 8601 UTC (e.g.
 * `2026-08-15T14:00:00.000Z`); `endTime` defaults to one week after
 * `startTime`, and the range between them must be <= 30 days. 402 if the host
 * has no seat assigned, 422 if the calendar is unpublished.
 */
const bookingCalendarTimeSlotsGet: ActionDefinition<Input> = {
  key: "booking-calendar-time-slots-get",
  type: "read",
  resource: "booking-calendar",
  title: "Get Available Time Slots",
  description:
    "List available time slots for a booking calendar (GET /booking-calendars/{id}/time-slots).",
  output: [
    { key: "slots", type: "array", label: "Available time slots" },
  ],
  params: [
    { key: "id", label: "Booking calendar ID", type: "string", required: true },
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      hint: "ISO 8601 UTC. Defaults to now.",
    },
    {
      key: "endTime",
      label: "End time",
      type: "datetime",
      hint: "ISO 8601 UTC. Defaults to 1 week after start; range must be <= 30 days.",
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(
      `/booking-calendars/${encodeURIComponent(input.id)}/time-slots`,
      { query: { start_time: input.startTime, end_time: input.endTime } },
    );
  },
};

export default bookingCalendarTimeSlotsGet;
