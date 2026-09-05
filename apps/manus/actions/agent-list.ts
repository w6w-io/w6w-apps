import type { ActionDefinition } from "@w6w/types";
import { type Agent, type AgentListResponse, ManusClient } from "../lib/client.ts";

/**
 * `GET /v2/agent.list` — every custom agent in the account. Use the returned
 * ids in `task-list` (`scope=agent_subtask`) or `agent-detail`.
 *
 * The vendor's own schema marks this endpoint API-key only — it does not
 * accept an OAuth2 bearer token — which does not affect this app, since it
 * implements only the API-key Auth method.
 */
const agentList: ActionDefinition<Record<string, never>, Agent[]> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List all custom agents in the account.",
  params: [],
  output: [{ key: "", type: "array", label: "Agents" }],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<AgentListResponse>("/v2/agent.list");
    return res.data;
  },
};

export default agentList;
