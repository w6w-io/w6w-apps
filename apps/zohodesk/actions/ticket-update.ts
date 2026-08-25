import type { ActionDefinition } from "@w6w/types";
import { deskUpdate, type DeskUpdateInput } from "../lib/desk.ts";
import { dataFields, orgId, recordId } from "../lib/params.ts";

const ticketUpdate: ActionDefinition<DeskUpdateInput> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: 'Update fields on an existing ticket, e.g. { "status": "Closed" }.',
  idempotent: true,
  params: [recordId, dataFields, orgId],
  output: [{ key: "id", type: "string", label: "Ticket ID" }],

  execute(input, ctx) {
    return deskUpdate(ctx, "/tickets", input);
  },
};

export default ticketUpdate;
