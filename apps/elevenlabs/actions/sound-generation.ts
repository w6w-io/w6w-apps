import type { ActionDefinition } from "@w6w/types";
import { type AudioResult, ElevenLabsClient } from "../lib/client.ts";
import { audioOutput, sfxOutputFormatOptions } from "../lib/params.ts";

/**
 * `POST /v1/sound-generation` — generate a sound effect from a text prompt.
 *
 * Answers audio bytes (`audio/mpeg`, binary schema), so the response is
 * base64-encoded exactly as in Text to Speech.
 *
 * ## Two constraints the API enforces and the form states
 *
 * `duration_seconds` is bounded at 0.5–30 seconds; leaving it empty lets
 * ElevenLabs choose a length from the prompt. `loop` produces a seamlessly
 * looping effect but is documented as available only on the
 * `eleven_text_to_sound_v2` model, which is also the default — so setting `loop`
 * together with an older model id is the way to get a confusing rejection.
 *
 * The output-format list is the text-to-speech list minus the `wav_*` family:
 * this endpoint's own `output_format` enum does not include WAV.
 *
 * Not idempotent: every call bills credits and the API accepts no idempotency
 * key.
 */
interface Input {
  text: string;
  durationSeconds?: number;
  promptInfluence?: number;
  loop?: boolean;
  modelId?: string;
  outputFormat?: string;
}

const soundGeneration: ActionDefinition<Input, AudioResult> = {
  key: "sound-generation",
  type: "perform",
  resource: "speech",
  title: "Generate Sound Effect",
  description: "Generate a sound effect from a text prompt. Returns base64-encoded audio.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Prompt",
      type: "text",
      required: true,
      placeholder: "A large, ancient wooden door slowly opening in an eerie, abandoned castle.",
      hint: "Describe the sound you want.",
    },
    {
      key: "durationSeconds",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 0.5, max: 30 },
      hint: "0.5 to 30 seconds. Leave empty to let ElevenLabs pick a length from the prompt.",
    },
    {
      key: "promptInfluence",
      label: "Prompt influence",
      type: "number",
      advanced: true,
      validation: { min: 0, max: 1 },
      hint: "Higher values follow the prompt more closely at the cost of variety.",
    },
    {
      key: "loop",
      label: "Loop seamlessly",
      type: "boolean",
      advanced: true,
      hint: "Produces a seamlessly looping effect. Only supported by the " +
        "`eleven_text_to_sound_v2` model, which is the default.",
    },
    {
      key: "modelId",
      label: "Model ID",
      type: "string",
      advanced: true,
      placeholder: "eleven_text_to_sound_v2",
      hint: "Leave empty for the API default (`eleven_text_to_sound_v2`).",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: sfxOutputFormatOptions,
      hint: "Defaults to mp3_44100_128. This endpoint offers no WAV formats.",
    },
  ],
  output: audioOutput,

  async execute(input, ctx) {
    const body: Record<string, unknown> = { text: input.text };
    if (typeof input.durationSeconds === "number") body.duration_seconds = input.durationSeconds;
    if (typeof input.promptInfluence === "number") body.prompt_influence = input.promptInfluence;
    if (input.loop === true) body.loop = true;
    if (input.modelId) body.model_id = input.modelId;

    ctx.log("info", "generating sound effect", { durationSeconds: input.durationSeconds });
    return await new ElevenLabsClient(ctx).binary("/v1/sound-generation", {
      method: "POST",
      query: { output_format: input.outputFormat },
      body,
    });
  },
};

export default soundGeneration;
