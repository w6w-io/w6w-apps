import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";

interface Input {
  ticketId: number;
}

const ticketDelete: ActionDefinition<Input> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description: "Permanently delete a ticket.",
  // Deleting an already-deleted ticket 404s rather than erroring on a duplicate
  // call, so retrying converges on the same end state.
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new GorgiasClient(ctx).request(`/tickets/${input.ticketId}`, { method: "DELETE" });
    return {};
  },
};

export default ticketDelete;
