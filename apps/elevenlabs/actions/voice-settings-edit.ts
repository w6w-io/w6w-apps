import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { voiceIdParam } from "../lib/params.ts";

/**
 * `POST /v1/voices/{voice_id}/settings/edit` — change a voice's stored settings.
 *
 * ## This is a whole-object write, not a patch
 *
 * The request body is the same `VoiceSettingsResponseModel` the read returns,
 * and it is applied as the voice's settings — so a field left empty is not
 * "leave it alone", it is "unset it". Read Get Voice Settings first and send
 * back every field you want to keep. The form makes each field optional because
 * the schema does, not because omission is safe.
 *
 * ## Idempotent, unlike the generation actions
 *
 * Writing the same settings twice leaves the voice in the same state and costs
 * nothing, so a retry after a dropped connection is safe. That is a genuine
 * difference from the synthesis actions, where a retry bills a second
 * generation.
 */
interface Input {
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

const voiceSettingsEdit: ActionDefinition<Input> = {
  key: "voice-settings-edit",
  type: "perform",
  resource: "voice",
  title: "Edit Voice Settings",
  description:
    "Replace a voice's stored settings. Send every field you want to keep — omitted fields are " +
    "not preserved.",
  idempotent: true,
  params: [
    voiceIdParam,
    {
      key: "stability",
      label: "Stability",
      type: "number",
      validation: { min: 0, max: 1 },
      hint: "0–1. Lower is more expressive and more variable between generations.",
    },
    {
      key: "similarityBoost",
      label: "Similarity boost",
      type: "number",
      validation: { min: 0, max: 1 },
      hint: "0–1. How closely to adhere to the original voice.",
    },
    {
      key: "style",
      label: "Style exaggeration",
      type: "number",
      hint: "Amplifies the original speaker's style. Raising it costs latency.",
    },
    {
      key: "useSpeakerBoost",
      label: "Speaker boost",
      type: "boolean",
      hint: "Boosts similarity to the original speaker, at a small latency cost.",
    },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      hint: "1.0 is the default speed; below 1.0 slows the speech down.",
    },
  ],
  output: [{ key: "status", type: "string", label: "`ok` when the settings were written" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (typeof input.stability === "number") body.stability = input.stability;
    if (typeof input.similarityBoost === "number") body.similarity_boost = input.similarityBoost;
    if (typeof input.style === "number") body.style = input.style;
    if (typeof input.useSpeakerBoost === "boolean") body.use_speaker_boost = input.useSpeakerBoost;
    if (typeof input.speed === "number") body.speed = input.speed;

    return new ElevenLabsClient(ctx).json(
      `/v1/voices/${encodeId(input.voiceId)}/settings/edit`,
      { method: "POST", body },
    );
  },
};

export default voiceSettingsEdit;
