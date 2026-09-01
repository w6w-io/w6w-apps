import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam, guestIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  guestId: string;
  ticketIdsToRemove?: string[];
  ticketTypeIdsToAdd?: string[];
  sendEmail?: boolean;
}

/**
 * `POST /v1/events/guests/update-tickets`.
 *
 * Removing a ticket does NOT issue a refund (per the vendor's own field
 * description) — pair with `guest-update-status`'s `shouldRefund` if a refund
 * is also needed. Every ticket added this way is a new $0 administrative
 * ticket, even for a normally-paid type.
 */
const guestUpdateTickets: ActionDefinition<Input> = {
  key: "guest-update-tickets",
  type: "perform",
  resource: "guest",
  title: "Update Guest Tickets",
  description: "Invalidate a guest's existing tickets and/or grant complimentary ones.",
  idempotent: false,
  params: [
    eventIdParam,
    guestIdParam,
    {
      key: "ticketIdsToRemove",
      label: "Ticket IDs to remove",
      type: "array",
      item: { type: "string", placeholder: "tkt-abc123" },
      hint: "Existing ticket IDs to invalidate. Does not refund. At least one valid ticket must " +
        "remain on the guest.",
    },
    {
      key: "ticketTypeIdsToAdd",
      label: "Ticket type IDs to add",
      type: "array",
      item: { type: "string", placeholder: "ttype-abc123" },
      hint:
        "Grants one complimentary ($0) ticket of each type listed, even for normally-paid types.",
    },
    {
      key: "sendEmail",
      label: "Email the guest",
      type: "boolean",
      default: true,
      hint: "Controls email only — the guest still gets an in-app notification either way.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/guests/update-tickets", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        guest_id: input.guestId,
        ticket_ids_to_remove: input.ticketIdsToRemove,
        tickets_to_add: input.ticketTypeIdsToAdd?.map((id) => ({ event_ticket_type_id: id })),
        send_email: input.sendEmail,
      }),
    });
    return { ok: true };
  },
};

export default guestUpdateTickets;
