import type { ActionDefinition } from "@w6w/types";
import { deskCreate, type DeskCreateInput } from "../lib/desk.ts";
import { dataFields, orgId } from "../lib/params.ts";

const ticketCreate: ActionDefinition<DeskCreateInput> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: '`subject` and `departmentId` are required, e.g. { "subject": "Cannot log in", ' +
    '"departmentId": "1892000000006907", "contactId": "1892000000042032" }. If `contactId` is ' +
    "omitted, include a nested `contact` object with `lastName` or `email` to create one inline.",
  idempotent: false,
  params: [dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Ticket ID" }],

  execute(input, ctx) {
    return deskCreate(ctx, "/tickets", input);
  },
};

export default ticketCreate;
