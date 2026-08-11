import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { voiceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/voices/{voice_id}` — one voice in full.
 *
 * Returns `VoiceResponseModel`: name, category, description, the `labels` map
 * that drives the library filters, `fine_tuning` state per model, sharing
 * metadata and the voice's stored `settings`.
 *
 * The `with_settings` query parameter is documented as "now deprecated. It is
 * ignored and will be removed in a future version", so this action does not
 * expose it. The stored settings come back either way; Get Voice Settings is
 * the narrower read when that is all you want.
 */
interface Input {
  voiceId: string;
}

const voiceGet: ActionDefinition<Input> = {
  key: "voice-get",
  type: "read",
  resource: "voice",
  title: "Get Voice",
  description: "Fetch one voice's full definition, including its labels and stored settings.",
  params: [voiceIdParam],
  output: [
    { key: "voice_id", type: "string", label: "Voice ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "category", type: "string", label: "premade, cloned, generated or professional" },
    { key: "description", type: "string", label: "Description" },
    { key: "labels", type: "object", label: "Accent, age, gender, use case — the filter labels" },
    { key: "settings", type: "object", label: "Stored voice settings" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/voices/${encodeId(input.voiceId)}`);
  },
};

export default voiceGet;
