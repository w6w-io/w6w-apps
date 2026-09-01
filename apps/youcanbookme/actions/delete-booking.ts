import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  bookingId: string;
}

/**
 * DELETE /{accountId}/profiles/{profileId}/bookings/{bookingId} — permanently
 * remove a booking (204 No Content). Distinct from `update-booking`'s
 * `cancelled: true`, which keeps the record and marks it cancelled instead.
 * Deleting an already-deleted booking reaches the same end state, so this is
 * idempotent.
 */
const deleteBooking: ActionDefinition<Input, void> = {
  key: "delete-booking",
  type: "perform",
  resource: "booking",
  title: "Delete Booking",
  description: "Permanently delete a booking (DELETE /profiles/{profileId}/bookings/{bookingId}).",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "bookingId", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new YouCanBookMeClient(ctx).request<void>(
      `/${input.accountId}/profiles/${input.profileId}/bookings/${input.bookingId}`,
      { method: "DELETE" },
    );
  },
};

export default deleteBooking;
