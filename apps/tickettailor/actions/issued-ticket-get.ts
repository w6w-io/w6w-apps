import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/issued_tickets/{issued_ticket_id}` — verified against `getIssuedTicketById`, 2026-09-05. */
interface Input {
  issuedTicketId: string;
}

const issuedTicketGet: ActionDefinition<Input> = {
  key: "issued-ticket-get",
  type: "read",
  resource: "issued-ticket",
  title: "Get Issued Ticket",
  description: "Fetch a single issued ticket by ID.",
  params: [
    {
      key: "issuedTicketId",
      label: "Issued Ticket ID",
      type: "string",
      required: true,
      placeholder: "it_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Issued ticket ID" },
    { key: "barcode", type: "string", label: "Barcode" },
    { key: "checked_in", type: "string", label: '"true"/"false"' },
    { key: "full_name", type: "string", label: "Attendee full name" },
    { key: "email", type: "string", label: "Order email" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "order_id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "valid or voided" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/issued_tickets/${encodeURIComponent(input.issuedTicketId)}`,
    );
  },
};

export default issuedTicketGet;
