import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam, ticketNumberParam, ticketStatusCategoryOptions } from "../lib/params.ts";

/**
 * `PATCH /agents/{agentId}/helpdesk/tickets/{ticketNumber}` — only provided
 * fields change. Fields are validated together but written independently
 * (Chatbase's own note), so a 500 can leave a partial update in place.
 * `assigneeId: null` unassigns; `assigneeEmail` does not accept null.
 */
interface Input {
  agentId: string;
  ticketNumber: number;
  statusCategory?: string;
  assigneeEmail?: string;
  unassign?: boolean;
  teamId?: string;
  clearTeam?: boolean;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Partially update a ticket's status, assignee, or team.",
  idempotent: true,
  params: [
    agentIdParam,
    ticketNumberParam,
    {
      key: "statusCategory",
      label: "Status category",
      type: "select",
      options: ticketStatusCategoryOptions,
      hint: "Resolves to that category's default status. Leave empty to leave unchanged.",
    },
    {
      key: "assigneeEmail",
      label: "Assignee email",
      type: "string",
      hint: "Ignored if Unassign is on.",
    },
    { key: "unassign", label: "Unassign", type: "boolean", hint: "Sends assigneeId: null." },
    {
      key: "teamId",
      label: "Team ID (uuid)",
      type: "string",
      hint: "Ignored if Clear team is on.",
    },
    { key: "clearTeam", label: "Clear team", type: "boolean", hint: "Sends teamId: null." },
  ],
  output: [
    { key: "ticketNumber", type: "number", label: "Ticket number" },
    { key: "statusCategory", type: "string", label: "Status category after the update" },
    { key: "assigneeId", type: "string", label: "Assigned agent user ID, or null" },
    { key: "teamId", type: "string", label: "Assigned team ID, or null" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = compact({
      statusCategory: input.statusCategory,
      assigneeEmail: input.unassign ? undefined : input.assigneeEmail,
      teamId: input.clearTeam ? undefined : input.teamId,
    });
    if (input.unassign) body.assigneeId = null;
    if (input.clearTeam) body.teamId = null;
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/tickets/${input.ticketNumber}`,
      { method: "PATCH", body },
    );
  },
};

export default ticketUpdate;
