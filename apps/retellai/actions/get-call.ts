import type { ActionDefinition } from "@w6w/types";
import { RetellClient } from "../lib/client.ts";

/**
 * `GET /v2/get-call/{call_id}` — retrieve one call's current state.
 *
 * Most of what makes a call record useful — `transcript`, `recording_url`,
 * `call_analysis`, `duration_ms` — is populated only once `call_status`
 * reaches `ended` or `error`. Calling this right after `create-phone-call` or
 * `create-web-call` returns a call whose status is still `registered` or
 * `ongoing` and whose transcript/recording fields are simply absent — that is
 * not a failure of this action, it is the call not having finished yet.
 */
interface Input {
  callId: string;
}

interface Output {
  call_id: string;
  call_type: string;
  call_status: string;
  agent_id: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  recording_url?: string;
  disconnection_reason?: string;
  [key: string]: unknown;
}

const getCall: ActionDefinition<Input, Output> = {
  key: "get-call",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Retrieve a call's current status, transcript and recording (once it has ended).",
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "call_type", type: "string", label: "Call type (phone_call / web_call)" },
    { key: "call_status", type: "string", label: "Call status" },
    { key: "agent_id", type: "string", label: "Agent ID" },
    { key: "from_number", type: "string", label: "From number (phone calls)" },
    { key: "to_number", type: "string", label: "To number (phone calls)" },
    { key: "start_timestamp", type: "number", label: "Start timestamp (ms)" },
    { key: "end_timestamp", type: "number", label: "End timestamp (ms)" },
    { key: "duration_ms", type: "number", label: "Duration (ms)" },
    { key: "transcript", type: "string", label: "Transcript (once ended)" },
    { key: "recording_url", type: "string", label: "Recording URL (once ended)" },
    { key: "disconnection_reason", type: "string", label: "Disconnection reason" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>(
      `/v2/get-call/${encodeURIComponent(input.callId)}`,
    );
  },
};

export default getCall;
