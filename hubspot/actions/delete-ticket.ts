import type { ActionDefinition } from "@w6w/types";
import { crmDelete } from "../lib/crm.ts";

interface Input {
  id: string;
}

const deleteTicket: ActionDefinition<Input> = {
  key: "delete-ticket",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description: "Archive a ticket (soft-delete).",
  params: [
    { key: "id", label: "Ticket ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return crmDelete(ctx, "tickets", input);
  },
};

export default deleteTicket;
