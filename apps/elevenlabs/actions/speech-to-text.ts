import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, formValue } from "../lib/client.ts";
import { sttModelOptions, timestampGranularityOptions } from "../lib/params.ts";

/**
 * `POST /v1/speech-to-text` — transcribe audio or video.
 *
 * ## Two things about this endpoint cost people an afternoon
 *
 * **1. The body is `multipart/form-data`, not JSON.** It is the only declared
 * content type for the request, and posting JSON fails validation with a
 * `422`. Every field below — including the booleans and numbers — is sent as a
 * form field, which is why they are stringified on the way out.
 *
 * **2. You do not have to upload a file.** The body's `file` field is optional,
 * and `source_url` takes the HTTPS URL of an audio or video file instead —
 * documented as supporting hosted media, YouTube and TikTok URLs. That is the
 * field this action exposes, because a workflow step passes a link, not a
 * multi-gigabyte upload. Exactly one of `file` and a URL may be given, so
 * exposing only the URL form removes the conflict entirely.
 *
 * (`cloud_storage_url` does the same thing and is marked deprecated in the
 * document in favour of `source_url`, so this action sends `source_url`.)
 *
 * ## The `202` that is not a result
 *
 * With `webhook` on, the endpoint "will return early without the transcription,
 * which will be delivered later via webhook" and answers `202`. This action does
 * not expose the flag: an Action's contract is to return the result of its call,
 * and returning an empty acknowledgement that silently means "look somewhere
 * else later" is worse than not offering it. Webhook delivery is out of scope
 * for this app.
 *
 * Not idempotent: every call bills the transcription and the API accepts no
 * idempotency key.
 */
interface Input {
  sourceUrl: string;
  modelId: string;
  languageCode?: string;
  numSpeakers?: number;
  diarize?: boolean;
  tagAudioEvents?: boolean;
  timestampsGranularity?: string;
  temperature?: number;
  seed?: number;
}

const speechToText: ActionDefinition<Input> = {
  key: "speech-to-text",
  type: "perform",
  resource: "speech",
  title: "Speech to Text",
  description: "Transcribe an audio or video file addressed by URL, with optional diarization.",
  idempotent: false,
  params: [
    {
      key: "sourceUrl",
      label: "Source URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/media/interview.mp3",
      hint: "HTTPS URL of the audio or video to transcribe. Hosted media files, YouTube and " +
        "TikTok URLs are supported. Pre-signed URLs and tokens in the query string are fine.",
    },
    {
      key: "modelId",
      label: "Model",
      type: "select",
      required: true,
      default: "scribe_v1",
      options: sttModelOptions,
      hint: "Required by the API — there is no default.",
    },
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      placeholder: "en",
      hint: "ISO 639-1 or 639-3. Leave empty to let the model detect the language; setting it " +
        "can improve accuracy when you already know it.",
    },
    {
      key: "diarize",
      label: "Identify speakers",
      type: "boolean",
      hint: "Annotate which speaker is talking.",
    },
    {
      key: "numSpeakers",
      label: "Maximum speakers",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 32 },
      hint: "Up to 32. Leave empty to let the model decide.",
    },
    {
      key: "tagAudioEvents",
      label: "Tag audio events",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "On by default, matching the API: tags things like (laughter) and (footsteps) in the " +
        "transcript.",
    },
    {
      key: "timestampsGranularity",
      label: "Timestamp granularity",
      type: "select",
      advanced: true,
      options: timestampGranularityOptions,
      hint: "Defaults to word-level timestamps.",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      advanced: true,
      validation: { min: 0, max: 2 },
      hint: "0 to 2. Higher is less deterministic. Leave empty for the model's own default.",
    },
    {
      key: "seed",
      label: "Seed",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0, max: 2147483647 },
      hint: "Best-effort deterministic sampling. Determinism is not guaranteed.",
    },
  ],
  output: [
    { key: "language_code", type: "string", label: "Detected or supplied language" },
    { key: "language_probability", type: "number", label: "Confidence in the language" },
    { key: "text", type: "string", label: "The full transcript" },
    { key: "words", type: "array", label: "Per-word timings, and speaker when diarized" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "transcribing media", { modelId: input.modelId });
    return await new ElevenLabsClient(ctx).json("/v1/speech-to-text", {
      method: "POST",
      // Every value is a string: this is a multipart body, not JSON.
      form: {
        model_id: formValue(input.modelId),
        source_url: formValue(input.sourceUrl),
        language_code: formValue(input.languageCode),
        num_speakers: formValue(input.numSpeakers),
        diarize: input.diarize === true ? "true" : undefined,
        // `tag_audio_events` defaults to true server-side, so only an explicit
        // opt-out is worth sending.
        tag_audio_events: input.tagAudioEvents === false ? "false" : undefined,
        timestamps_granularity: formValue(input.timestampsGranularity),
        temperature: formValue(input.temperature),
        seed: formValue(input.seed),
      },
    });
  },
};

export default speechToText;
