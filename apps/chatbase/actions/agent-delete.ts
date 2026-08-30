import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `DELETE /agents/{agentId}` — permanent, irreversible, and disconnects any
 * active integration (Slack, WhatsApp, etc.) the agent held.
 *
 * Not marked idempotent: a second call against an already-deleted agent
 * answers `AGENT_NOT_FOUND` rather than a second `{"success": true}`, so a
 * blind retry does not behave the same way twice.
 */
interface Input {
  agentId: string;
}

const agentDelete: ActionDefinition<Input> = {
  key: "agent-delete",
  type: "perform",
  resource: "agent",
  title: "Delete Agent",
  description: "Permanently delete an agent and all its sources. Irreversible.",
  idempotent: false,
  params: [agentIdParam],
  output: [{ key: "success", type: "boolean", label: "Whether the agent was deleted" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(`/agents/${encodeURIComponent(input.agentId)}`, {
      method: "DELETE",
    });
  },
};

export default agentDelete;
