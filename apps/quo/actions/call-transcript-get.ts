import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `GET /v1/call-transcripts/{id}` — the transcript of a call (regular or Sona-handled). Only
 * available on Business and Scale plans.
 */
interface Input {
  id: string;
}

const callTranscriptGet: ActionDefinition<Input> = {
  key: "call-transcript-get",
  type: "read",
  resource: "call",
  title: "Get Call Transcript",
  description: "Get the transcript of a call by its unique call ID. Only available on " +
    "Business and Scale plans; supports both regular calls and calls handled by Sona.",
  params: [
    {
      key: "id",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "The unique identifier of the call.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Transcript (callId, status, duration, createdAt, dialogue: [{content, start, " +
        "end, identifier, userId}])",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/call-transcripts/${encodeURIComponent(input.id)}`);
  },
};

export default callTranscriptGet;
