import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventIdParam, guestIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  guestId: string;
}

/** `GET /v1/events/guests/get`. Returns `GuestDetailed` — the ticket/order detail `guest-list` omits. */
const guestGet: ActionDefinition<Input> = {
  key: "guest-get",
  type: "read",
  resource: "guest",
  title: "Get Guest",
  description: "Fetch one guest's full detail, including their tickets and orders.",
  params: [eventIdParam, guestIdParam],
  output: [
    { key: "id", type: "string", label: "Guest ID" },
    { key: "user_email", type: "string", label: "Email" },
    { key: "user_name", type: "string", label: "Name" },
    { key: "approval_status", type: "string", label: "Approval status" },
    { key: "event_tickets", type: "array", label: "Tickets" },
    { key: "event_ticket_orders", type: "array", label: "Orders" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/guests/get", {
      query: { event_id: input.eventId, id: input.guestId },
    });
  },
};

export default guestGet;
