import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `PUT /agents/{agentId}/auto-retrain` — `true` retrains every 7 days and
 * checks for the latest updates; `false` disables it. Requires the agent to
 * have been trained at least once (`AGENT_NOT_TRAINED` otherwise).
 */
interface Input {
  agentId: string;
  enabled: boolean;
}

const agentAutoRetrainToggle: ActionDefinition<Input> = {
  key: "agent-auto-retrain-toggle",
  type: "perform",
  resource: "agent",
  title: "Toggle Auto-Retrain",
  description: "Enable or disable automatic retraining every 7 days for an agent.",
  idempotent: true,
  params: [
    agentIdParam,
    { key: "enabled", label: "Enabled", type: "boolean", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the setting was applied" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/auto-retrain`,
      { method: "PUT", body: { enabled: input.enabled } },
    );
  },
};

export default agentAutoRetrainToggle;
