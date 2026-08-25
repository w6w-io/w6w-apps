import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  rescheduleReason?: string;
}

/**
 * POST /bookings/{id}/request-reschedule — asks the customer to pick a new
 * time; does not itself change `starting_time`. Also refuses paid bookings
 * (422), same as cancel.
 */
const bookingRequestReschedule: ActionDefinition<Input> = {
  key: "booking-request-reschedule",
  type: "perform",
  resource: "booking",
  title: "Request Reschedule",
  description: "Ask the customer to reschedule a booking (POST /bookings/{id}/request-reschedule).",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Booking ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    { key: "rescheduleReason", label: "Reschedule reason", type: "text" },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(
      `/bookings/${encodeURIComponent(input.id)}/request-reschedule`,
      { method: "POST", body: { reschedule_reason: input.rescheduleReason } },
    );
  },
};

export default bookingRequestReschedule;
