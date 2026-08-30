import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `GET /v1/call-recordings/{callId}` — recordings for a call, sorted chronologically with the
 * oldest segment first. A `read`, not a `search`: it is a fixed, non-paginated list scoped to
 * one call, not a filterable collection.
 */
interface Input {
  callId: string;
}

const callRecordingsGet: ActionDefinition<Input> = {
  key: "call-recordings-get",
  type: "read",
  resource: "call",
  title: "Get Call Recordings",
  description: "Get the recordings for a call, oldest segment first.",
  params: [
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "The unique identifier of the call.",
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Recordings (id, status, type, duration, startTime, url)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/call-recordings/${encodeURIComponent(input.callId)}`);
  },
};

export default callRecordingsGet;
