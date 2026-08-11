import type { ActionDefinition } from "@w6w/types";
import { type AudioResult, ElevenLabsClient, encodeId } from "../lib/client.ts";
import { audioOutput, historyItemIdParam } from "../lib/params.ts";

/**
 * `GET /v1/history/{history_item_id}/audio` — re-download a past generation.
 *
 * ## Bytes, not JSON — and this one is a `read`
 *
 * Like the synthesis endpoints, its only declared `200` is `audio/mpeg` with a
 * binary schema, so the body is base64-encoded here. Unlike them it costs no
 * characters: the audio already exists, and fetching it again does not
 * regenerate it. That is what makes this a `read` while Text to Speech is a
 * `perform`, and it is the cheap way to get audio a previous run produced
 * instead of synthesising the same text twice.
 *
 * The content type is returned verbatim, because a history item's audio comes
 * back in whatever format it was generated in.
 */
interface Input {
  historyItemId: string;
}

const historyAudioGet: ActionDefinition<Input, AudioResult> = {
  key: "history-audio-get",
  type: "read",
  resource: "history",
  title: "Get History Audio",
  description:
    "Re-download the audio of a past generation as base64. Costs no characters — it is not " +
    "regenerated.",
  params: [historyItemIdParam],
  output: audioOutput,

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).binary(
      `/v1/history/${encodeId(input.historyItemId)}/audio`,
    );
  },
};

export default historyAudioGet;
