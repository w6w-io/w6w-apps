import type { ActionDefinition } from "@w6w/types";
import type { DeleteResult } from "../lib/client.ts";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `DELETE /v1/event_series/{event_series_id}/ticket_types/{ticket_type_id}` —
 * verified against `deleteTicketTypeById`, 2026-09-05. Irreversible. Answers
 * `200` with a small JSON body, never `204` — see `lib/client.ts`.
 */
interface Input {
  eventSeriesId: string;
  ticketTypeId: string;
}

const ticketTypeDelete: ActionDefinition<Input, DeleteResult> = {
  key: "ticket-type-delete",
  type: "perform",
  resource: "ticket-type",
  title: "Delete Ticket Type",
  description: "Permanently delete a ticket type. Irreversible.",
  idempotent: false,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    {
      key: "ticketTypeId",
      label: "Ticket Type ID",
      type: "string",
      required: true,
      placeholder: "tt_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ticket type ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "deleted", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<DeleteResult>(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/ticket_types/${
        encodeURIComponent(input.ticketTypeId)
      }`,
      { method: "DELETE" },
    );
  },
};

export default ticketTypeDelete;
