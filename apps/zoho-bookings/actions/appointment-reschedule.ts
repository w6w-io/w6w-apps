import type { ActionDefinition } from "@w6w/types";
import { type BookingsEnvelope, unwrapReturnValue, ZohoBookingsClient } from "../lib/client.ts";
import { appointmentOutput, bookingId, staffId } from "../lib/params.ts";

interface Input {
  bookingId: string;
  staffId?: string;
  groupId?: string;
  startTime?: string;
}

/**
 * `POST /bookings/v1/json/rescheduleappointment`. The vendor doc lists
 * `staff_id`/`group_id`/`start_time` as one combined requirement — "any one
 * of the above id is mandatory" — enforced in `execute` rather than left to
 * Zoho's own 400.
 */
const appointmentReschedule: ActionDefinition<Input> = {
  key: "appointment-reschedule",
  type: "perform",
  resource: "appointment",
  title: "Reschedule Appointment",
  description:
    "Move a booked appointment to a different time and/or a different staff member or group. " +
    "At least one of Staff ID, Group ID or Start time is required.",
  idempotent: true,
  params: [
    bookingId,
    { ...staffId, hint: "Move the appointment to this staff member." },
    { key: "groupId", label: "Group ID", type: "string", hint: "Move to this staff group." },
    {
      key: "startTime",
      label: "New start time",
      type: "string",
      hint: "Format: dd-MMM-yyyy HH:mm:ss (24-hour), e.g. 30-Apr-2030 22:00:00.",
    },
  ],
  output: appointmentOutput,

  async execute(input, ctx) {
    if (!input.staffId && !input.groupId && !input.startTime) {
      throw new Error("Provide one of `staffId`, `groupId` or `startTime`.");
    }
    const form = new FormData();
    form.append("booking_id", input.bookingId);
    if (input.staffId) form.append("staff_id", input.staffId);
    if (input.groupId) form.append("group_id", input.groupId);
    if (input.startTime) form.append("start_time", input.startTime);

    const body = await new ZohoBookingsClient(ctx).request<BookingsEnvelope>(
      "/rescheduleappointment",
      { method: "POST", form },
    );
    return unwrapReturnValue(body, "POST", "/bookings/v1/json/rescheduleappointment");
  },
};

export default appointmentReschedule;
