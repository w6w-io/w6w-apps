import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `PUT /admin/bookings/{id}/decline` — decline a pending booking. Like
 * `booking-approve`, this needs the "approve booking" custom feature enabled
 * and only applies to bookings still pending approval.
 */
const bookingDecline: ActionDefinition<Input> = {
  key: "booking-decline",
  type: "perform",
  resource: "booking",
  title: "Decline Booking",
  description: "Decline a pending booking (PUT /admin/bookings/{id}/decline). Requires the " +
    '"approve booking" custom feature.',
  idempotent: true,
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request(`/admin/bookings/${encodeURIComponent(input.id)}/decline`, {
      method: "PUT",
    });
  },
};

export default bookingDecline;
