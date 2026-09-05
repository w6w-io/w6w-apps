import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/issued_tickets` — verified against `createIssuedTicket`,
 * 2026-09-05. Issues a ticket directly from inventory (`eventId` +
 * `ticketTypeId`) or from a pre-existing hold (`holdId`) — send exactly one
 * of the two. The vendor's own description states this is **not free**:
 * "Issuing tickets via the API is charged at one credit per issued ticket,
 * even if the ticket is free," and fails outright for a "seated" ticket type
 * that uses a seating chart. The ticket is not attached to any order.
 */
interface Input {
  fullName: string;
  eventId?: string;
  ticketTypeId?: string;
  holdId?: string;
  email?: string;
  sendEmail?: boolean;
  barcode?: string;
  reference?: string;
}

const issuedTicketCreate: ActionDefinition<Input> = {
  key: "issued-ticket-create",
  type: "perform",
  resource: "issued-ticket",
  title: "Create Issued Ticket",
  description:
    "Issue a ticket directly from a ticket type's inventory, or from an existing hold. Costs " +
    "one credit per ticket, even if free; not usable for seated ticket types.",
  idempotent: false,
  params: [
    { key: "fullName", label: "Attendee full name", type: "string", required: true },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Together with Ticket Type ID: issue from event inventory.",
    },
    { key: "ticketTypeId", label: "Ticket Type ID", type: "string" },
    { key: "holdId", label: "Hold ID", type: "string", hint: "Alternative: issue from a hold." },
    { key: "email", label: "Attendee email", type: "string" },
    {
      key: "sendEmail",
      label: "Send confirmation email",
      type: "boolean",
      hint: "Requires a valid email, separate event confirmation emails enabled, and the event " +
        "series approved by Ticket Tailor — not guaranteed even when true.",
    },
    { key: "barcode", label: "Barcode", type: "string", hint: "Auto-generated if left empty." },
    { key: "reference", label: "External reference", type: "string" },
  ],
  output: [{ key: "data", type: "array", label: "Issued ticket(s) created" }],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/issued_tickets", {
      method: "POST",
      form: {
        full_name: input.fullName,
        event_id: input.eventId,
        ticket_type_id: input.ticketTypeId,
        hold_id: input.holdId,
        email: input.email,
        send_email: input.sendEmail,
        barcode: input.barcode,
        reference: input.reference,
      },
    });
  },
};

export default issuedTicketCreate;
