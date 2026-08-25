import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

interface Input extends DeskGetInput {
  include?: string;
}

const ticketGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Get a single ticket by id.",
  params: [
    recordId,
    orgId,
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated: contacts, products, assignee, departments, team.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Ticket ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/tickets", input, { include: input.include });
  },
};

export default ticketGet;
