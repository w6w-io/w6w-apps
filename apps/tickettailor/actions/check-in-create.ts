import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/check_ins` — verified against `createCheckIn`, 2026-09-05. The
 * vendor's own field for exactly this purpose is `local_unique_id`: "Used for
 * safely retrying a check in without creating it multiple times." This
 * action sends `ctx.invocation.invocationId` as that field and declares
 * `idempotent: true` — a retried step re-scans the same ticket without
 * double-counting a check-in (or check-out).
 */
interface Input {
  issuedTicketId: string;
  /** "1" (check in) or "-1" (check out) — a `select`'s value always arrives as a string. */
  quantity: "1" | "-1";
  checkInAt?: number;
}

const checkInCreate: ActionDefinition<Input> = {
  key: "check-in-create",
  type: "perform",
  resource: "check-in",
  title: "Create Check-in",
  description: "Check a ticket in (or out) at the door.",
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
      key: "quantity",
      label: "Direction",
      type: "select",
      required: true,
      default: "1",
      options: [
        { label: "Check in", value: "1" },
        { label: "Check out", value: "-1" },
      ],
    },
    {
      key: "checkInAt",
      label: "Check-in timestamp (Unix seconds)",
      type: "number",
      hint: "Defaults to now if omitted.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Check-in ID" },
    { key: "issued_ticket_id", type: "string", label: "Issued ticket ID" },
    { key: "quantity", type: "number", label: "1 = checked in, -1 = checked out" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/check_ins", {
      method: "POST",
      form: {
        issued_ticket_id: input.issuedTicketId,
        quantity: input.quantity,
        check_in_at: input.checkInAt,
        // See module docs: makes a retried step idempotent instead of
        // creating a second check-in/check-out event.
        local_unique_id: ctx.invocation?.invocationId,
      },
    });
  },
};

export default checkInCreate;
