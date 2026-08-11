import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, ElevenLabsClient, encodeId } from "../lib/client.ts";
import {
  enableLoggingParam,
  textNormalizationOptions,
  ttsBody,
  type TtsContinuityInput,
  ttsContinuityParams,
  ttsModelIdParam,
  ttsOutputFormatOptions,
  voiceIdParam,
  voiceSettingsParam,
} from "../lib/params.ts";

/**
 * `POST /v1/text-to-speech/{voice_id}/with-timestamps` — speech plus
 * per-character timings.
 *
 * ## The one TTS endpoint that answers JSON
 *
 * Where the plain endpoint declares `audio/mpeg` binary, this one declares
 * `AudioWithTimestampsResponseModel`: `audio_base64` (the same audio, already
 * base64-encoded by the vendor) plus `alignment` and `normalized_alignment`,
 * each a list of characters with start and end times in seconds.
 *
 * That makes it the better default for anything that has to *do* something with
 * the timing — subtitles, captions, lip-sync, or splitting one generation across
 * several clips — and it costs the same characters as the plain endpoint.
 *
 * `alignment` is indexed against the text as submitted; `normalized_alignment`
 * against the text after ElevenLabs expanded numbers, dates and abbreviations.
 * Aligning subtitles to the submitted text needs the first; measuring what was
 * actually spoken needs the second. They differ in length whenever normalization
 * changes anything, which is the usual cause of subtitles drifting.
 *
 * Not idempotent, for the same reason as the plain endpoint: every call bills
 * characters and the API accepts no idempotency key.
 */
interface Input extends TtsContinuityInput {
  voiceId: string;
  text: string;
  modelId?: string;
  languageCode?: string;
  outputFormat?: string;
  voiceSettings?: unknown;
  seed?: number;
  applyTextNormalization?: string;
  enableLogging?: boolean;
}

const textToSpeechWithTimestamps: ActionDefinition<Input> = {
  key: "text-to-speech-with-timestamps",
  type: "perform",
  resource: "speech",
  title: "Text to Speech with Timestamps",
  description:
    "Synthesise speech and get per-character start/end times alongside the base64 audio.",
  idempotent: false,
  params: [
    voiceIdParam,
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "The text to speak. Each model caps the length per request — see " +
        "`maximum_text_length_per_request` in List Models.",
    },
    ttsModelIdParam,
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: ttsOutputFormatOptions,
      hint: "Defaults to mp3_44100_128. Higher-fidelity formats are gated by plan tier.",
    },
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      advanced: true,
      placeholder: "en",
      hint: "ISO 639-1. Enforces a language for the model and its text normalization.",
    },
    voiceSettingsParam,
    {
      key: "seed",
      label: "Seed",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0, max: 4294967295 },
      hint: "Best-effort deterministic sampling. Determinism is not guaranteed.",
    },
    {
      key: "applyTextNormalization",
      label: "Text normalization",
      type: "select",
      advanced: true,
      options: textNormalizationOptions,
      hint: "Also decides whether `alignment` and `normalized_alignment` differ.",
    },
    ...ttsContinuityParams(),
    enableLoggingParam,
  ],
  output: [
    { key: "audio_base64", type: "string", label: "Audio, base64-encoded by ElevenLabs" },
    { key: "alignment", type: "object", label: "Character timings against the submitted text" },
    {
      key: "normalized_alignment",
      type: "object",
      label: "Character timings against the normalized text",
    },
  ],

  async execute(input, ctx) {
    const settings = asOptionalJson<unknown>(input.voiceSettings, "Voice settings override");
    ctx.log("info", "synthesising speech with timestamps", {
      voiceId: input.voiceId,
      characters: input.text?.length ?? 0,
    });
    return await new ElevenLabsClient(ctx).json(
      `/v1/text-to-speech/${encodeId(input.voiceId)}/with-timestamps`,
      {
        method: "POST",
        query: {
          output_format: input.outputFormat,
          enable_logging: input.enableLogging === false ? "false" : undefined,
        },
        body: ttsBody(input, settings),
      },
    );
  },
};

export default textToSpeechWithTimestamps;
