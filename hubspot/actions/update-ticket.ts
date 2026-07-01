import type { ActionDefinition } from "@w6w/types";
import { crmUpdate } from "../lib/crm.ts";

interface Input {
  id: string;
  properties: Record<string, unknown>;
  idProperty?: string;
}

const updateTicket: ActionDefinition<Input> = {
  key: "update-ticket",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Patch a ticket's properties.",
  params: [
    { key: "id", label: "Ticket ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "json", required: true },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmUpdate(ctx, "tickets", input);
  },
};

export default updateTicket;
