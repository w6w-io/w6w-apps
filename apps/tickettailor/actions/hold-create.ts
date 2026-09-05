import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/holds` — verified against `createHold`, 2026-09-05. The vendor's
 * `ticket_type_id` request field is actually an association MAP of ticket
 * type ID -> quantity (`{"tt_1": 1, "tt_2": 5}`), sent here as bracket-keyed
 * form fields (`ticket_type_id[tt_1]=1`) — see `lib/client.ts`'s
 * `toFormBody` note on why that convention, and its one caveat.
 */
interface Input {
  eventId: string;
  note: string;
  ticketTypeId: string;
  quantity: number;
}

const holdCreate: ActionDefinition<Input> = {
  key: "hold-create",
  type: "perform",
  resource: "hold",
  title: "Create Hold",
  description: "Reserve a quantity of one ticket type against an event, without selling it.",
  idempotent: false,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true, placeholder: "ev_123" },
    {
      key: "note",
      label: "Note",
      type: "string",
      required: true,
      placeholder: "Reserved for press",
    },
    {
      key: "ticketTypeId",
      label: "Ticket Type ID",
      type: "string",
      required: true,
      placeholder: "tt_123",
    },
    { key: "quantity", label: "Quantity to hold", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Hold ID" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "total_on_hold", type: "number", label: "Total tickets on hold" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/holds", {
      method: "POST",
      form: {
        event_id: input.eventId,
        note: input.note,
        ticket_type_id: { [input.ticketTypeId]: input.quantity },
      },
    });
  },
};

export default holdCreate;
