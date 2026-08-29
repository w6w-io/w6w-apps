import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/call/{id}` — status and detail for one concluded call: direction,
 * duration, recording URLs, CSAT scores, routing breadcrumbs, voicemail
 * metadata and transcription text.
 */
interface Input {
  callId: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Get status and detailed information for one concluded call.",
  params: [
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "Take it from the `id` field of a List Calls result.",
    },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "state", type: "string", label: "Call state" },
    { key: "direction", type: "string", label: "inbound or outbound" },
    { key: "duration", type: "number", label: "Duration (ms)" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/call/${encodeId(input.callId)}`);
  },
};

export default callGet;
