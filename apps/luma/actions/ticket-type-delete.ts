import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventTicketTypeIdParam } from "../lib/params.ts";

interface Input {
  eventTicketTypeId: string;
}

/** `POST /v1/events/ticket-types/delete`. Empty response on success. */
const ticketTypeDelete: ActionDefinition<Input> = {
  key: "ticket-type-delete",
  type: "perform",
  resource: "ticket-type",
  title: "Delete Ticket Type",
  description: "Delete a ticket type from an event.",
  idempotent: true,
  params: [eventTicketTypeIdParam],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/ticket-types/delete", {
      method: "POST",
      body: { event_ticket_type_id: input.eventTicketTypeId },
    });
    return { ok: true };
  },
};

export default ticketTypeDelete;
