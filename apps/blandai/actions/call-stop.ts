import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `POST /v1/calls/{call_id}/stop` — end an active call, or cancel a scheduled one.
 *
 * Verified against `docs.bland.ai/api-v1/post/calls-id-stop`. Response is the
 * flat `{"status", "message"}` shape.
 */
interface Input {
  callId: string;
}

const callStop: ActionDefinition<Input> = {
  key: "call-stop",
  type: "perform",
  resource: "call",
  title: "Stop Call",
  description: "End an active phone call, or cancel a scheduled one, by call_id.",
  // A call that is already over answers the same "not found"/"already ended"
  // message on a second attempt — retrying never places or affects a second call.
  idempotent: true,
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "message", type: "string", label: "Status message" },
  ],

  async execute(input, ctx) {
    const res = await new BlandClient(ctx).request<{ status: string; message?: string }>(
      `/v1/calls/${encodeURIComponent(input.callId)}/stop`,
      { method: "POST" },
    );
    return { status: res.status, message: res.message };
  },
};

export default callStop;
