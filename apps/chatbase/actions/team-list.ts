import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/helpdesk/teams` — a bare array, ordered by creation
 * date. Exactly one team is marked `isDefault` for the agent.
 */
interface Input {
  agentId: string;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "ticket",
  title: "List Teams",
  description: "List the helpdesk teams configured for an agent.",
  params: [agentIdParam],
  output: [{ key: "[]", type: "array", label: "Teams — a bare array, not an envelope" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/teams`,
    );
  },
};

export default teamList;
