import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `PUT /admin/bookings/{id}/approve` — approve a pending booking. Only
 * meaningful when the company has the "approve booking" custom feature
 * enabled; SimplyBook.me answers `400 Bad request` for a booking that is not
 * pending approval (already confirmed or canceled).
 */
const bookingApprove: ActionDefinition<Input> = {
  key: "booking-approve",
  type: "perform",
  resource: "booking",
  title: "Approve Booking",
  description: "Approve a pending booking (PUT /admin/bookings/{id}/approve). Requires the " +
    '"approve booking" custom feature.',
  idempotent: true,
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request(`/admin/bookings/${encodeURIComponent(input.id)}/approve`, {
      method: "PUT",
    });
  },
};

export default bookingApprove;
