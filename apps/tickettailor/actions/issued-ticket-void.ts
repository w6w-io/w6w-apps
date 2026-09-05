import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/issued_tickets/{issued_ticket_id}/void` — verified against
 * `voidIssuedTicketById`, 2026-09-05. Irreversible: only voids this one
 * ticket, does not cancel the order or issue a refund. `voidToHold` turns
 * the voided ticket's allocation into a hold instead of returning it to
 * sale.
 */
interface Input {
  issuedTicketId: string;
  voidToHold?: "true" | "false";
}

const issuedTicketVoid: ActionDefinition<Input> = {
  key: "issued-ticket-void",
  type: "perform",
  resource: "issued-ticket",
  title: "Void Issued Ticket",
  description: "Void a single issued ticket. Does not cancel the order or refund it. Irreversible.",
  idempotent: true,
  params: [
    {
      key: "issuedTicketId",
      label: "Issued Ticket ID",
      type: "string",
      required: true,
      placeholder: "it_123",
    },
    {
      key: "voidToHold",
      label: "Convert to hold",
      type: "select",
      hint: "Keeps the allocation off sale as a hold instead of returning it to inventory.",
      options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Voided issued ticket ID" },
    { key: "hold_id", type: "string", label: "Hold ID, if void_to_hold was used" },
    { key: "voided", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/issued_tickets/${encodeURIComponent(input.issuedTicketId)}/void`,
      { method: "POST", form: { void_to_hold: input.voidToHold } },
    );
  },
};

export default issuedTicketVoid;
