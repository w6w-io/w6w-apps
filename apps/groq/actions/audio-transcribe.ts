import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, GroqClient } from "../lib/client.ts";

interface Input {
  file?: string;
  url?: string;
  model: string;
  language?: string;
  prompt?: string;
  responseFormat?: "json" | "text" | "verbose_json";
  temperature?: number;
  timestampGranularities?: Array<"word" | "segment">;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * POST /audio/transcriptions — Whisper speech-to-text. Groq accepts EITHER a
 * multipart `file` OR a plain `url` field (including a base64 data URL) in
 * the same request; OpenAI's own endpoint only ever took a file upload. `url`
 * is the cheaper path when the audio already lives somewhere reachable and
 * avoids buffering a large multipart body through the sandbox — so both are
 * exposed and exactly one is required.
 *
 * `response_format` here is `json | text | verbose_json` only — `srt`/`vtt`
 * (which OpenAI's Whisper endpoint supports) are not in Groq's documented
 * enum and are left out rather than guessed.
 */
const audioTranscribe: ActionDefinition<Input> = {
  key: "audio-transcribe",
  type: "perform",
  resource: "audio",
  title: "Transcribe Audio",
  description: "Transcribe audio into the input language.",
  idempotent: false,
  params: [
    {
      key: "file",
      label: "Audio file (base64)",
      type: "text",
      hint: "Base64-encoded audio (flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm). " +
        "Provide this OR `url`, not both.",
    },
    {
      key: "url",
      label: "Audio URL",
      type: "string",
      hint: "A URL Groq can fetch directly (supports base64 data URLs too). " +
        "Provide this OR `file`, not both.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "whisper-large-v3-turbo",
    },
    { key: "language", label: "Language (ISO-639-1)", type: "string" },
    { key: "prompt", label: "Prompt", type: "text" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "text", label: "Text" },
        { value: "verbose_json", label: "Verbose JSON" },
      ],
    },
    { key: "temperature", label: "Temperature", type: "number" },
    {
      key: "timestampGranularities",
      label: "Timestamp granularities",
      type: "multiselect",
      options: [
        { value: "word", label: "Word" },
        { value: "segment", label: "Segment" },
      ],
      showIf: { field: "responseFormat", equals: "verbose_json" },
      hint: "Only used when response format is Verbose JSON.",
    },
    { key: "fileName", label: "File name", type: "string", default: "audio.mp3" },
    { key: "fileMimeType", label: "File MIME type", type: "string", default: "audio/mpeg" },
  ],
  output: [
    { key: "text", type: "string", label: "Transcript text" },
  ],

  execute(input, ctx) {
    if (!input.file && !input.url) {
      throw new Error("Provide either `file` (base64) or `url`.");
    }
    const client = new GroqClient(ctx);
    const form = new FormData();
    if (input.file) {
      form.append(
        "file",
        new Blob([base64ToBytes(input.file)], { type: input.fileMimeType ?? "audio/mpeg" }),
        input.fileName ?? "audio.mp3",
      );
    } else if (input.url) {
      form.append("url", input.url);
    }
    form.append("model", input.model);
    if (input.language) form.append("language", input.language);
    if (input.prompt) form.append("prompt", input.prompt);
    form.append("response_format", input.responseFormat ?? "json");
    if (input.temperature !== undefined) form.append("temperature", String(input.temperature));
    for (const g of input.timestampGranularities ?? []) {
      form.append("timestamp_granularities[]", g);
    }

    return client.request("/audio/transcriptions", { method: "POST", form });
  },
};

export default audioTranscribe;
