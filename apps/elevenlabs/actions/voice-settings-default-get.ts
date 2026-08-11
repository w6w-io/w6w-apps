import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";

/**
 * `GET /v1/voices/settings/default` — the platform-wide default voice settings.
 *
 * The baseline a voice starts from before anyone edits it. Useful as the "reset
 * to sensible values" source when a workflow builds a `voice_settings` override,
 * and as the reference point when comparing what a particular voice has been
 * tuned to.
 *
 * It takes no parameters at all, and — unlike the per-voice settings read — it
 * needs no voice to exist.
 */
const voiceSettingsDefaultGet: ActionDefinition<Record<string, never>> = {
  key: "voice-settings-default-get",
  type: "read",
  resource: "voice",
  title: "Get Default Voice Settings",
  description: "Read the platform-wide default voice settings.",
  params: [],
  output: [
    { key: "stability", type: "number", label: "Stability, 0–1" },
    { key: "similarity_boost", type: "number", label: "Similarity boost, 0–1" },
    { key: "style", type: "number", label: "Style exaggeration" },
    { key: "use_speaker_boost", type: "boolean", label: "Speaker boost" },
    { key: "speed", type: "number", label: "Speaking speed, 1.0 is normal" },
  ],

  execute(_input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/voices/settings/default");
  },
};

export default voiceSettingsDefaultGet;
