import type { ActionDefinition } from "@w6w/types";
import { type BookingsEnvelope, unwrapReturnValue, ZohoBookingsClient } from "../lib/client.ts";
import { appointmentOutput, bookingId } from "../lib/params.ts";

interface Input {
  bookingId: string;
}

/** `GET /bookings/v1/json/getappointment`. */
const appointmentGet: ActionDefinition<Input> = {
  key: "appointment-get",
  type: "read",
  resource: "appointment",
  title: "Get Appointment",
  description: "Get the details of a previously booked appointment.",
  params: [bookingId],
  output: appointmentOutput,

  async execute(input, ctx) {
    const body = await new ZohoBookingsClient(ctx).request<BookingsEnvelope>("/getappointment", {
      query: { booking_id: input.bookingId },
    });
    return unwrapReturnValue(body, "GET", "/bookings/v1/json/getappointment");
  },
};

export default appointmentGet;
