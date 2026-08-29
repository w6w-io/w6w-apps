import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `POST /v1/calls/active/stop` — end every active call on the account.
 *
 * Verified against `docs.bland.ai/api-v1/post/calls-active-stop`.
 */
const callStopAll: ActionDefinition<Record<string, never>> = {
  key: "call-stop-all",
  type: "perform",
  resource: "call",
  title: "Stop All Active Calls",
  description: "End every active phone call on this account.",
  // Ending an already-empty set of active calls is a safe no-op.
  idempotent: true,
  params: [],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "message", type: "string", label: "Status message" },
    { key: "numCalls", type: "number", label: "Number of active calls being cancelled" },
  ],

  async execute(_input, ctx) {
    const res = await new BlandClient(ctx).request<{
      status: string;
      message?: string;
      num_calls?: number;
    }>("/v1/calls/active/stop", { method: "POST" });
    return { status: res.status, message: res.message, numCalls: res.num_calls };
  },
};

export default callStopAll;
