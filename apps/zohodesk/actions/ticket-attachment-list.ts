import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, ticketId } from "../lib/params.ts";

interface Input extends DeskListInput {
  ticketId: string;
  include?: string;
}

const ticketAttachmentList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "ticket-attachment-list",
  type: "read",
  resource: "ticket-attachment",
  title: "List Ticket Attachments",
  description: "List attachments on a ticket.",
  params: [
    ticketId,
    orgId,
    { key: "include", label: "Include", type: "string", hint: "Supported value: creator." },
  ],
  output: [{ key: "data", type: "array", label: "Attachments" }],

  execute(input, ctx) {
    return deskList(ctx, `/tickets/${encodeURIComponent(input.ticketId)}/attachments`, input, {
      include: input.include,
    });
  },
};

export default ticketAttachmentList;
