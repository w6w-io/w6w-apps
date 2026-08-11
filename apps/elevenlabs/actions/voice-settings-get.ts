import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { voiceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/voices/{voice_id}/settings` — the settings stored against one voice.
 *
 * These are the values a synthesis request uses when it sends no
 * `voice_settings` override: `stability` and `similarity_boost` (0–1), `style`,
 * `use_speaker_boost` and `speed`.
 *
 * Worth reading before overriding: an override replaces the stored values for
 * that one request, so it is easy to change one field and unintentionally reset
 * the others to whatever the caller happened to type.
 */
interface Input {
  voiceId: string;
}

const voiceSettingsGet: ActionDefinition<Input> = {
  key: "voice-settings-get",
  type: "read",
  resource: "voice",
  title: "Get Voice Settings",
  description: "Read the settings stored against one voice.",
  params: [voiceIdParam],
  output: [
    { key: "stability", type: "number", label: "Stability, 0–1" },
    { key: "similarity_boost", type: "number", label: "Similarity boost, 0–1" },
    { key: "style", type: "number", label: "Style exaggeration" },
    { key: "use_speaker_boost", type: "boolean", label: "Speaker boost" },
    { key: "speed", type: "number", label: "Speaking speed, 1.0 is normal" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/voices/${encodeId(input.voiceId)}/settings`);
  },
};

export default voiceSettingsGet;
