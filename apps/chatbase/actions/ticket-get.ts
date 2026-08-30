import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, ticketNumberParam } from "../lib/params.ts";

/** `GET /agents/{agentId}/helpdesk/tickets/{ticketNumber}` — one ticket. */
interface Input {
  agentId: string;
  ticketNumber: number;
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch a single ticket by its per-agent ticket number.",
  params: [agentIdParam, ticketNumberParam],
  output: [
    { key: "ticketNumber", type: "number", label: "Ticket number" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "statusCategory", type: "string", label: "Status category" },
    { key: "assigneeId", type: "string", label: "Assigned agent user ID, or null" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/tickets/${input.ticketNumber}`,
    );
  },
};

export default ticketGet;
