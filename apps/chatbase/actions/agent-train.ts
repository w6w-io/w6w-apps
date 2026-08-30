import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/train` — queues an asynchronous training job.
 * Training is not complete when this returns; poll `GET /agents/{agentId}`
 * for `status`. A retry while one is already running answers
 * `AGENT_ALREADY_TRAINING` rather than queuing a second job.
 */
interface Input {
  agentId: string;
}

const agentTrain: ActionDefinition<Input> = {
  key: "agent-train",
  type: "perform",
  resource: "agent",
  title: "Train Agent",
  description: "Queue a training job for the agent. Asynchronous — poll Get Agent for `status`.",
  idempotent: false,
  params: [agentIdParam],
  output: [{ key: "success", type: "boolean", label: "Whether training was queued" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/train`,
      { method: "POST" },
    );
  },
};

export default agentTrain;
