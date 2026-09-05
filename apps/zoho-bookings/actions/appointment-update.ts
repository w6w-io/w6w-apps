import type { ActionDefinition } from "@w6w/types";
import { type BookingsEnvelope, unwrapReturnValue, ZohoBookingsClient } from "../lib/client.ts";
import { appointmentOutput, bookingId } from "../lib/params.ts";

interface Input {
  bookingId: string;
  action: "completed" | "cancel" | "noshow";
}

/**
 * `POST /bookings/v1/json/updateappointment` — updates a booking's status.
 * The vendor calls this "Update Appointment", but the only documented effect
 * is a status transition (`completed` / `cancel` / `noshow`); there is no
 * documented way to change an appointment's time, service or customer
 * details through this endpoint — see `appointment-reschedule` for moving a
 * booking to a different time/staff.
 */
const appointmentUpdate: ActionDefinition<Input> = {
  key: "appointment-update",
  type: "perform",
  resource: "appointment",
  title: "Update Appointment Status",
  description: "Mark a booked appointment completed, cancelled or a no-show.",
  idempotent: true,
  params: [
    bookingId,
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "completed", label: "Completed" },
        { value: "cancel", label: "Cancel" },
        { value: "noshow", label: "No-show" },
      ],
    },
  ],
  output: appointmentOutput,

  async execute(input, ctx) {
    const form = new FormData();
    form.append("booking_id", input.bookingId);
    form.append("action", input.action);
    const body = await new ZohoBookingsClient(ctx).request<BookingsEnvelope>(
      "/updateappointment",
      { method: "POST", form },
    );
    return unwrapReturnValue(body, "POST", "/bookings/v1/json/updateappointment");
  },
};

export default appointmentUpdate;
