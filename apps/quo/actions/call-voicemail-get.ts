import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `GET /v1/call-voicemails/{callId}` — the voicemail left on a call. Returns null data fields
 * while the recording is still processing, and populated fields once it's done.
 */
interface Input {
  callId: string;
}

const callVoicemailGet: ActionDefinition<Input> = {
  key: "call-voicemail-get",
  type: "read",
  resource: "call",
  title: "Get Call Voicemail",
  description: "Get the voicemail associated with a call. Fields are null while the recording " +
    "is still processing.",
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
      type: "object",
      label: "Voicemail (id, status, duration, transcript, recordingUrl)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/call-voicemails/${encodeURIComponent(input.callId)}`);
  },
};

export default callVoicemailGet;
