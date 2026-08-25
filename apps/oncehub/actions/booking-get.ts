import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  expand?: string;
}

/**
 * GET /bookings/{id} — a single booking by ID. `owner`, `contact` and
 * `conversation` are returned as bare ids unless expanded (`?expand=`).
 */
const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description: "Fetch a single booking by ID (GET /bookings/{id}).",
  output: [
    { key: "id", type: "string", label: "Booking ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "starting_time", type: "string", label: "Starting time" },
    { key: "duration_minutes", type: "number", label: "Duration (minutes)" },
    { key: "booking_calendar", type: "string", label: "Booking calendar ID" },
  ],
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      hint: "Comma-separated: owner, contact, conversation.",
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/bookings/${encodeURIComponent(input.id)}`, {
      query: { expand: input.expand },
    });
  },
};

export default bookingGet;
