import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  bookingId: string;
  startsAt?: string;
  endsAt?: string;
  timeZone?: string;
  cancelled?: boolean;
  cancellationReason?: string;
  fields?: string;
}

/**
 * PATCH /{accountId}/profiles/{profileId}/bookings/{bookingId} — partial
 * update. The `Booking` schema documents both `startsAt`/`endsAt` (a
 * reschedule) and `cancelled`/`cancellationReason` as plain settable fields,
 * so one PATCH action covers both — a repeated identical PATCH reaches the
 * same end state, so this is marked idempotent.
 */
const updateBooking: ActionDefinition<Input> = {
  key: "update-booking",
  type: "perform",
  resource: "booking",
  title: "Update Booking",
  description: "Reschedule or cancel a booking (PATCH /profiles/{profileId}/bookings/{bookingId}).",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "bookingId", label: "Booking ID", type: "string", required: true },
    { key: "startsAt", label: "New start time", type: "datetime", row: "reschedule" },
    { key: "endsAt", label: "New end time", type: "datetime", row: "reschedule" },
    { key: "timeZone", label: "Time zone", type: "string", advanced: true },
    { key: "cancelled", label: "Cancelled", type: "boolean", row: "cancel" },
    { key: "cancellationReason", label: "Cancellation reason", type: "string", row: "cancel" },
    {
      key: "fields",
      label: "Response fields",
      type: "string",
      advanced: true,
      default: "id",
      hint: "Comma-separated fields to return on the updated booking.",
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timeZone: input.timeZone,
      cancelled: input.cancelled,
      cancellationReason: input.cancellationReason,
    };
    return new YouCanBookMeClient(ctx).request(
      `/${input.accountId}/profiles/${input.profileId}/bookings/${input.bookingId}`,
      { method: "PATCH", query: { fields: input.fields ?? "id" }, body },
    );
  },
};

export default updateBooking;
