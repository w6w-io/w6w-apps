import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam } from "../lib/params.ts";

/**
 * `GET /v2/transcript/{id}/sentences` — the transcript split into semantically segmented
 * sentences. Only meaningful once the transcript's own `status` is `completed`.
 */
interface Input {
  transcriptId: string;
  region?: string;
}

const transcriptSentencesGet: ActionDefinition<Input> = {
  key: "transcript-sentences-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript Sentences",
  description: "Get the transcript split into semantically segmented sentences.",
  params: [transcriptIdParam, regionParam],
  output: [
    { key: "id", type: "string", label: "Transcript ID" },
    { key: "confidence", type: "number", label: "Overall confidence (0-1)" },
    { key: "audio_duration", type: "number", label: "Audio duration (seconds)" },
    { key: "sentences", type: "array", label: "Sentences, each with text/start/end/words" },
  ],

  execute(input, ctx) {
    return new AssemblyAiClient(ctx).json(
      `/transcript/${encodeURIComponent(input.transcriptId)}/sentences`,
      { region: input.region },
    );
  },
};

export default transcriptSentencesGet;
