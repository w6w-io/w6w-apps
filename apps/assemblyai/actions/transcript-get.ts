import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam, transcriptOutputFields } from "../lib/params.ts";

/**
 * `GET /v2/transcript/{id}` — show a transcript's current status, and its text and Audio
 * Intelligence results once `status` is `completed`.
 */
interface Input {
  transcriptId: string;
  region?: string;
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description: "Show a transcript's current status. The transcript is ready when status is " +
    '"completed".',
  params: [transcriptIdParam, regionParam],
  output: transcriptOutputFields,

  execute(input, ctx) {
    return new AssemblyAiClient(ctx).json(
      `/transcript/${encodeURIComponent(input.transcriptId)}`,
      { region: input.region },
    );
  },
};

export default transcriptGet;
