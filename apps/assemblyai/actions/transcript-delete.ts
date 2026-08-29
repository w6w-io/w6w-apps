import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam, transcriptOutputFields } from "../lib/params.ts";

/**
 * `DELETE /v2/transcript/{id}` — remove the transcript's data and mark it deleted.
 *
 * Per AssemblyAI's own docs: "Remove the data from the transcript and mark it as deleted."
 * A file uploaded via `/v2/upload` (not used by this app — see the README) is deleted
 * alongside it immediately. The response is `200` with the transcript object itself,
 * `audio_url` now `http://deleted_by_user` — not a bare `204`.
 *
 * `idempotent: true`: the end state (data gone, transcript marked deleted) is the same no
 * matter how many times this runs — AssemblyAI does not document a distinct "already
 * deleted" error, and the operation is a pure state transition to a terminal state.
 */
interface Input {
  transcriptId: string;
  region?: string;
}

const transcriptDelete: ActionDefinition<Input> = {
  key: "transcript-delete",
  type: "perform",
  resource: "transcript",
  title: "Delete Transcript",
  description: "Remove a transcript's data and mark it deleted.",
  idempotent: true,
  params: [transcriptIdParam, regionParam],
  output: transcriptOutputFields,

  execute(input, ctx) {
    ctx.log("info", "deleting AssemblyAI transcript", { transcriptId: input.transcriptId });
    return new AssemblyAiClient(ctx).json(
      `/transcript/${encodeURIComponent(input.transcriptId)}`,
      { region: input.region, method: "DELETE" },
    );
  },
};

export default transcriptDelete;
