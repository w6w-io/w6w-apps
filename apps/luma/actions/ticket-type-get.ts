import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventTicketTypeIdParam } from "../lib/params.ts";

interface Input {
  eventTicketTypeId: string;
}

/** `GET /v1/events/ticket-types/get`. */
const ticketTypeGet: ActionDefinition<Input> = {
  key: "ticket-type-get",
  type: "read",
  resource: "ticket-type",
  title: "Get Ticket Type",
  description: "Fetch one ticket type by ID.",
  params: [eventTicketTypeIdParam],
  output: [
    { key: "id", type: "string", label: "Ticket type ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Free or paid" },
    { key: "cents", type: "number", label: "Price (cents)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "max_capacity", type: "number", label: "Max capacity" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/ticket-types/get", {
      query: { event_ticket_type_id: input.eventTicketTypeId },
    });
  },
};

export default ticketTypeGet;
