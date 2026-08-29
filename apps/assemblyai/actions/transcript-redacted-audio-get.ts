import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam } from "../lib/params.ts";

/**
 * `GET /v2/transcript/{id}/redacted-audio` — the status and URL of the PII-redacted audio
 * file, when `transcript-submit`'s Redact PII audio flag was enabled.
 *
 * Per AssemblyAI's own docs, the redacted audio file is only available for **24 hours**
 * after the transcript completes — download it promptly. `redacted_audio_url` is a
 * pre-signed URL good for that window, not a permanent resource identifier.
 */
interface Input {
  transcriptId: string;
  region?: string;
}

const transcriptRedactedAudioGet: ActionDefinition<Input> = {
  key: "transcript-redacted-audio-get",
  type: "read",
  resource: "transcript",
  title: "Get Redacted Audio",
  description: "Get the status and download URL of the PII-redacted audio file. Only " +
    "available for 24 hours after the transcript completes.",
  params: [transcriptIdParam, regionParam],
  output: [
    { key: "status", type: "string", label: "Redacted audio status" },
    { key: "redacted_audio_url", type: "string", label: "Pre-signed download URL (24h)" },
  ],

  execute(input, ctx) {
    return new AssemblyAiClient(ctx).json(
      `/transcript/${encodeURIComponent(input.transcriptId)}/redacted-audio`,
      { region: input.region },
    );
  },
};

export default transcriptRedactedAudioGet;
