import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { historyItemIdParam } from "../lib/params.ts";

/**
 * `GET /v1/history/{history_item_id}` — one past generation's metadata.
 *
 * The text that was spoken, the voice and model used, the character count it
 * was billed at, its state and its `request_id`.
 *
 * That `request_id` is the field worth having: it is what the Text to Speech
 * continuity parameters (`previous_request_ids` / `next_request_ids`) take, so
 * this read is how a workflow stitches a later generation onto an earlier one it
 * did not make in the same run.
 *
 * This returns metadata only — the audio itself is a separate call, Get History
 * Audio, because it is served as bytes rather than JSON.
 */
interface Input {
  historyItemId: string;
}

const historyGet: ActionDefinition<Input> = {
  key: "history-get",
  type: "read",
  resource: "history",
  title: "Get History Item",
  description: "Fetch one past generation's metadata, including its request_id and cost.",
  params: [historyItemIdParam],
  output: [
    { key: "history_item_id", type: "string", label: "History item ID" },
    { key: "request_id", type: "string", label: "Request ID — usable for TTS continuity" },
    { key: "voice_id", type: "string", label: "Voice used" },
    { key: "model_id", type: "string", label: "Model used" },
    { key: "text", type: "string", label: "The text that was spoken" },
    { key: "character_count_change_to", type: "number", label: "Character counter after this" },
    { key: "date_unix", type: "number", label: "When it was generated" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/history/${encodeId(input.historyItemId)}`);
  },
};

export default historyGet;
