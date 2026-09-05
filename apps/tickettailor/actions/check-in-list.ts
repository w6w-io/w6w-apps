import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/check_ins` — verified against `getCheckInList`, 2026-09-05. */
interface Input {
  eventId?: string;
  eventSeriesId?: string;
  issuedTicketId?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const checkInList: ActionDefinition<Input> = {
  key: "check-in-list",
  type: "read",
  resource: "check-in",
  title: "List Check-ins",
  description: "List ticket check-in/check-out events, paginated.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", placeholder: "ev_123" },
    { key: "eventSeriesId", label: "Event Series ID", type: "string", placeholder: "es_123" },
    { key: "issuedTicketId", label: "Issued Ticket ID", type: "string", placeholder: "it_123" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Check-ins" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/check_ins", {
      query: {
        event_id: input.eventId,
        event_series_id: input.eventSeriesId,
        issued_ticket_id: input.issuedTicketId,
        limit: input.limit,
        starting_after: input.startingAfter,
        ending_before: input.endingBefore,
      },
    });
  },
};

export default checkInList;
