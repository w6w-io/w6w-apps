import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /admin/bookings/{id}` — full booking detail (`AdminBookingDetailsEntity`),
 * a superset of the list entity: also carries the edit log, intake-form
 * additional field values, products/attributes, invoice and membership
 * detail, and the booking comment.
 */
const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description: "Get full details for one booking by id (GET /admin/bookings/{id}).",
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request(`/admin/bookings/${encodeURIComponent(input.id)}`);
  },
};

export default bookingGet;
