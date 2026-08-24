import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam } from "../lib/params.ts";

interface Output {
  entries: unknown[];
}

/**
 * `GET /_/public-api/v2/recordings/:recording_id/transcript` — the full
 * transcript as a bare JSON array of
 * `{ participant_id, speaker, start, end, text }` entries (`start`/`end` are
 * ms offsets from the recording start). Grain returns the array directly,
 * with no wrapper object, so it is wrapped here under `entries` to fit this
 * platform's object-shaped `output` contract.
 */
const recordingTranscriptGet: ActionDefinition<{ recordingId: string }, Output> = {
  key: "recording-transcript-get",
  type: "read",
  resource: "recording",
  title: "Get Recording Transcript (JSON)",
  description: "Fetch a recording's transcript as structured entries (speaker, start, end, text).",
  params: [recordingIdParam],
  output: [
    {
      key: "entries",
      type: "array",
      label: "Transcript entries (participant_id, speaker, start, end, text)",
    },
  ],

  async execute(input, ctx) {
    const result = await new GrainClient(ctx).request<unknown[]>(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/transcript`,
    );
    return { entries: Array.isArray(result) ? result : [] };
  },
};

export default recordingTranscriptGet;
