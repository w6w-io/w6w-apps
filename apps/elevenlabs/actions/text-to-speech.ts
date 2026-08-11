import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, type AudioResult, ElevenLabsClient, encodeId } from "../lib/client.ts";
import {
  audioOutput,
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
 * `POST /v1/text-to-speech/{voice_id}` — turn text into speech.
 *
 * ## This endpoint answers audio bytes, not JSON
 *
 * Its only declared `200` response is content type `audio/mpeg` with schema
 * `{"type": "string", "format": "binary"}`. There is no JSON envelope to unwrap
 * and `res.json()` throws on the first byte. The bytes are read and
 * base64-encoded so they can travel as a workflow step's result; `content_type`
 * is returned verbatim so a downstream step can name the file correctly rather
 * than assuming `.mp3` — the `output_format` parameter can select WAV, PCM,
 * Opus, μ-law or A-law.
 *
 * If you want the audio *and* per-character timings, use Text to Speech with
 * Timestamps instead: it returns the same audio already base64-encoded by the
 * vendor, plus alignment, for the same credit cost.
 *
 * ## Not idempotent, and deliberately so
 *
 * Every call bills characters against the plan allowance, and the API accepts no
 * idempotency key of any kind. A runtime that retried this on a dropped
 * connection would bill twice. `seed` makes the *output* reproducible; it does
 * not make the *request* free.
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

const textToSpeech: ActionDefinition<Input, AudioResult> = {
  key: "text-to-speech",
  type: "perform",
  resource: "speech",
  title: "Text to Speech",
  description: "Synthesise speech from text with a chosen voice. Returns base64-encoded audio.",
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
      hint: "ISO 639-1. Enforces a language for the model and its text normalization. Ignored by " +
        "models that do not support the code.",
    },
    voiceSettingsParam,
    {
      key: "seed",
      label: "Seed",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0, max: 4294967295 },
      hint: "Best-effort deterministic sampling: the same seed and parameters should give the " +
        "same audio. Determinism is not guaranteed.",
    },
    {
      key: "applyTextNormalization",
      label: "Text normalization",
      type: "select",
      advanced: true,
      options: textNormalizationOptions,
      hint: "Controls whether numbers, dates and abbreviations are expanded before synthesis.",
    },
    ...ttsContinuityParams(),
    enableLoggingParam,
  ],
  output: audioOutput,

  async execute(input, ctx) {
    const settings = asOptionalJson<unknown>(input.voiceSettings, "Voice settings override");
    ctx.log("info", "synthesising speech", {
      voiceId: input.voiceId,
      characters: input.text?.length ?? 0,
    });
    return await new ElevenLabsClient(ctx).binary(
      `/v1/text-to-speech/${encodeId(input.voiceId)}`,
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

export default textToSpeech;
