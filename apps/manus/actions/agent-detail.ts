import type { ActionDefinition } from "@w6w/types";
import { type Agent, type AgentDetailResponse, ManusClient } from "../lib/client.ts";

interface Input {
  agentId: string;
}

/**
 * `GET /v2/agent.detail` — one custom agent's nickname, description and
 * associated task.
 */
const agentDetail: ActionDefinition<Input, Agent> = {
  key: "agent-detail",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Retrieve one custom agent's details.",
  params: [
    { key: "agentId", label: "Agent ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "task_id", type: "string", label: "Associated task ID" },
    { key: "nickname", type: "string", label: "Nickname" },
    { key: "about", type: "string", label: "About / bio" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<AgentDetailResponse>("/v2/agent.detail", {
      query: { agent_id: input.agentId },
    });
    return res.agent;
  },
};

export default agentDetail;
