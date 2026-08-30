import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/clone` — a full deep-clone, including sources,
 * except Notion sources (Chatbase's own documented exclusion). Each call
 * creates a brand-new agent.
 */
interface Input {
  agentId: string;
}

const agentClone: ActionDefinition<Input> = {
  key: "agent-clone",
  type: "perform",
  resource: "agent",
  title: "Clone Agent",
  description: "Create a full deep-clone of an agent, including its sources (except Notion).",
  idempotent: false,
  params: [agentIdParam],
  output: [{ key: "id", type: "string", label: "New agent ID" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/clone`,
      { method: "POST" },
    );
  },
};

export default agentClone;
