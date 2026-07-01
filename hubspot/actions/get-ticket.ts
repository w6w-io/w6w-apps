import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";

const getTicket: ActionDefinition<CrmGetInput> = {
  key: "get-ticket",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch a ticket by ID.",
  params: [
    { key: "id", label: "Ticket ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "string" },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmGet(ctx, "tickets", input);
  },
};

export default getTicket;
