import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/** `GET /agents/{agentId}` — the bare `Agent` object, no envelope. */
interface Input {
  agentId: string;
}

const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Fetch one agent's full configuration.",
  params: [agentIdParam],
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "name", type: "string", label: "Agent name" },
    { key: "instructions", type: "string", label: "System prompt" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(`/agents/${encodeURIComponent(input.agentId)}`);
  },
};

export default agentGet;
