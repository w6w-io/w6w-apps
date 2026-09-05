import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/holds/{hold_id}` — verified against `updateHold`, 2026-09-05.
 * Optionally adjusts the note and/or one ticket type's held quantity.
 */
interface Input {
  holdId: string;
  note?: string;
  ticketTypeId?: string;
  quantity?: number;
}

const holdUpdate: ActionDefinition<Input> = {
  key: "hold-update",
  type: "perform",
  resource: "hold",
  title: "Update Hold",
  description: "Update a hold's note, or a ticket type's held quantity (0 removes it).",
  idempotent: true,
  params: [
    { key: "holdId", label: "Hold ID", type: "string", required: true, placeholder: "ho_123" },
    { key: "note", label: "Note", type: "string" },
    { key: "ticketTypeId", label: "Ticket Type ID to adjust", type: "string" },
    {
      key: "quantity",
      label: "New quantity for that ticket type",
      type: "number",
      hint: "0 removes the ticket type from the hold.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Hold ID" },
    { key: "note", type: "string", label: "Note" },
    { key: "total_on_hold", type: "number", label: "Total tickets on hold" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(`/holds/${encodeURIComponent(input.holdId)}`, {
      method: "POST",
      form: {
        note: input.note,
        ticket_type_id: input.ticketTypeId && input.quantity !== undefined
          ? { [input.ticketTypeId]: input.quantity }
          : undefined,
      },
    });
  },
};

export default holdUpdate;
