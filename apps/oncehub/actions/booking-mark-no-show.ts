import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** POST /bookings/{id}/no-show — flips the booking's status to `no_show`. */
const bookingMarkNoShow: ActionDefinition<Input> = {
  key: "booking-mark-no-show",
  type: "perform",
  resource: "booking",
  title: "Mark Booking as No-Show",
  description: "Set a booking's status to no-show by ID (POST /bookings/{id}/no-show).",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Booking ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/bookings/${encodeURIComponent(input.id)}/no-show`, {
      method: "POST",
    });
  },
};

export default bookingMarkNoShow;
