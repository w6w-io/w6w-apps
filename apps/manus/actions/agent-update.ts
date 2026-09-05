import type { ActionDefinition } from "@w6w/types";
import { type Agent, type AgentUpdateResponse, compact, ManusClient } from "../lib/client.ts";

interface Input {
  agentId: string;
  nickname?: string;
  about?: string;
}

/**
 * `POST /v2/agent.update` — update a custom agent's nickname and/or
 * description. `idempotent: true`: setting the same values twice converges
 * to the same end state.
 */
const agentUpdate: ActionDefinition<Input, Agent> = {
  key: "agent-update",
  type: "perform",
  resource: "agent",
  title: "Update Agent",
  description: "Update a custom agent's nickname or description.",
  idempotent: true,
  params: [
    { key: "agentId", label: "Agent ID", type: "string", required: true },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "about", label: "About / bio", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "task_id", type: "string", label: "Associated task ID" },
    { key: "nickname", type: "string", label: "Nickname" },
    { key: "about", type: "string", label: "About / bio" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<AgentUpdateResponse>("/v2/agent.update", {
      method: "POST",
      body: compact({ agent_id: input.agentId, nickname: input.nickname, about: input.about }),
    });
    return res.agent;
  },
};

export default agentUpdate;
