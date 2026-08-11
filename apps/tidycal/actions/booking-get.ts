import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { bookingIdParam } from "../lib/params.ts";

/**
 * `GET /api/bookings/{booking}` — one booking, with its contact, its answers to
 * the booking type's questions, and its payment if the type was paid.
 *
 * The response is the **bare `Booking` entity**, not `{"data": …}` — this is one
 * of the four single-resource reads where TidyCal drops the envelope. See
 * `lib/client.ts`.
 *
 * TidyCal documents `403` for a booking that belongs to someone else and `404`
 * for one that does not exist; both surface as a thrown error carrying the
 * vendor's own message.
 */
interface Input {
  booking: number;
}

const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get booking",
  description: "Fetch one booking by ID, including its contact, question answers and payment.",
  params: [bookingIdParam],
  output: [
    { key: "id", type: "number", label: "Booking ID" },
    { key: "starts_at", type: "string", label: "Start time (UTC)" },
    { key: "ends_at", type: "string", label: "End time (UTC)" },
    { key: "cancelled_at", type: "string", label: "Cancellation time, if cancelled" },
    { key: "timezone", type: "string", label: "Booker's timezone" },
    { key: "meeting_url", type: "string", label: "Meeting URL" },
    { key: "contact", type: "object", label: "Contact" },
    { key: "questions", type: "array", label: "Question answers" },
    { key: "payment", type: "object", label: "Payment" },
  ],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/bookings/${encodeId(input.booking)}`);
  },
};

export default bookingGet;
