import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /admin/bookings/{id}` — cancel a booking. Despite the HTTP verb,
 * the vendor calls this "Cancel booking" (not a hard delete) and it returns
 * the canceled `AdminBookingDetailsEntity`, not an empty body.
 */
const bookingCancel: ActionDefinition<Input> = {
  key: "booking-cancel",
  type: "perform",
  resource: "booking",
  title: "Cancel Booking",
  description: "Cancel a booking by id (DELETE /admin/bookings/{id}).",
  idempotent: true,
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request(`/admin/bookings/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default bookingCancel;
