import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/helpdesk/ticket-statuses` — a **bare array**, unlike
 * every paginated list in this app; there is no cursor because the set of
 * statuses per agent is small and configured, not accumulated.
 */
interface Input {
  agentId: string;
}

const ticketStatusList: ActionDefinition<Input> = {
  key: "ticket-status-list",
  type: "read",
  resource: "ticket",
  title: "List Ticket Statuses",
  description:
    "List the active (non-archived) ticket statuses for an agent, ordered by category then " +
    "position. Answers a bare array — no pagination.",
  params: [agentIdParam],
  output: [{ key: "[]", type: "array", label: "Ticket statuses — a bare array, not an envelope" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/ticket-statuses`,
    );
  },
};

export default ticketStatusList;
