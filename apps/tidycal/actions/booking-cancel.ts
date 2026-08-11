import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TidyCalClient } from "../lib/client.ts";
import { bookingIdParam } from "../lib/params.ts";

/**
 * `PATCH /api/bookings/{booking}/cancel` — cancel a booking.
 *
 * **PATCH, not POST or DELETE.** Confirmed live on 2026-08-11: any other verb on
 * that path answers `405` with `Allow: PATCH`. There is no delete-a-booking
 * endpoint at all.
 *
 * `idempotent: true` — cancelling converges: the first call cancels, and a retry
 * after a dropped connection finds the booking already cancelled. TidyCal
 * answers that second call `400 Bad Request — Booking is already cancelled`,
 * which surfaces as an error rather than a silent success, so a retry never
 * cancels something twice or produces a second cancellation email.
 *
 * The response is the bare `Booking` entity, not `{"data": …}`.
 */
interface Input {
  booking: number;
  reason?: string;
}

const bookingCancel: ActionDefinition<Input> = {
  key: "booking-cancel",
  type: "perform",
  resource: "booking",
  title: "Cancel booking",
  description: "Cancel a booking by ID, with an optional reason.",
  idempotent: true,
  params: [
    bookingIdParam,
    {
      key: "reason",
      label: "Reason",
      type: "text",
      hint:
        "Optional. TidyCal declares the request body required but every field in it optional, " +
        "so an empty object is sent when no reason is given.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Booking ID" },
    { key: "cancelled_at", type: "string", label: "Cancellation time" },
  ],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/bookings/${encodeId(input.booking)}/cancel`, {
      method: "PATCH",
      body: compact({ reason: input.reason }),
    });
  },
};

export default bookingCancel;
