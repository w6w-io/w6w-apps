import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  cancellationReason?: string;
  sendCancellationEmail?: boolean;
}

/**
 * POST /bookings/{id}/cancel. Note: bookings paid via Stripe cannot be
 * canceled through this endpoint — OnceHub returns 422 and asks you to use
 * the Activity Stream in the app instead.
 */
const bookingCancel: ActionDefinition<Input> = {
  key: "booking-cancel",
  type: "perform",
  resource: "booking",
  title: "Cancel Booking",
  description: "Cancel a booking by ID (POST /bookings/{id}/cancel). Fails for paid bookings.",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Booking ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    { key: "cancellationReason", label: "Cancellation reason", type: "text" },
    {
      key: "sendCancellationEmail",
      label: "Send cancellation email",
      type: "boolean",
      default: true,
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/bookings/${encodeURIComponent(input.id)}/cancel`, {
      method: "POST",
      body: {
        cancellation_reason: input.cancellationReason,
        send_cancellation_email: input.sendCancellationEmail,
      },
    });
  },
};

export default bookingCancel;
