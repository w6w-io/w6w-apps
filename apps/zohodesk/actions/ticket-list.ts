import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams } from "../lib/params.ts";

interface Input extends DeskListInput {
  departmentIds?: string;
  channel?: string;
  assignee?: string;
  include?: string;
}

const ticketList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "ticket-list",
  type: "read",
  resource: "ticket",
  title: "List Tickets",
  description: "List tickets, with pagination support.",
  params: [
    orgId,
    {
      key: "departmentIds",
      label: "Department IDs",
      type: "string",
      hint: "Comma-separated department ids to filter by. Zoho's own special value " +
        '"All Departments" is passed through as-is.',
    },
    {
      key: "channel",
      label: "Channel",
      type: "string",
      hint: "Comma-separated channels the ticket was created through (Email, Phone, ...).",
    },
    {
      key: "assignee",
      label: "Assignee",
      type: "string",
      hint: '"Unassigned", or one or more agent ids comma-separated.',
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated: contacts, products, assignee, departments, team, isRead.",
    },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Tickets" }],

  execute(input, ctx) {
    return deskList(ctx, "/tickets", input, {
      departmentIds: input.departmentIds,
      channel: input.channel,
      assignee: input.assignee,
      include: input.include,
    });
  },
};

export default ticketList;
