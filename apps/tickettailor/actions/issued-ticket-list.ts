import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/issued_tickets` — verified against `getAllIssuedTickets`, 2026-09-05. */
interface Input {
  eventId?: string;
  eventSeriesId?: string;
  orderId?: string;
  barcode?: string;
  name?: string;
  email?: string;
  reference?: string;
  status?: "valid" | "voided";
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const issuedTicketList: ActionDefinition<Input> = {
  key: "issued-ticket-list",
  type: "read",
  resource: "issued-ticket",
  title: "List Issued Tickets",
  description: "List issued tickets, paginated.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", placeholder: "ev_123" },
    { key: "eventSeriesId", label: "Event Series ID", type: "string", placeholder: "es_123" },
    { key: "orderId", label: "Order ID", type: "string", placeholder: "or_123" },
    { key: "barcode", label: "Barcode", type: "string" },
    { key: "name", label: "Attendee name", type: "string" },
    { key: "email", label: "Attendee email", type: "string" },
    { key: "reference", label: "Imported reference", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Valid", value: "valid" },
        { label: "Voided", value: "voided" },
      ],
    },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Issued tickets" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/issued_tickets", {
      query: {
        event_id: input.eventId,
        event_series_id: input.eventSeriesId,
        order_id: input.orderId,
        barcode: input.barcode,
        name: input.name,
        email: input.email,
        reference: input.reference,
        status: input.status,
        limit: input.limit,
        starting_after: input.startingAfter,
        ending_before: input.endingBefore,
      },
    });
  },
};

export default issuedTicketList;
