import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, GroqClient } from "../lib/client.ts";

interface Input {
  file?: string;
  url?: string;
  model: string;
  prompt?: string;
  responseFormat?: "json" | "text" | "verbose_json";
  temperature?: number;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * POST /audio/translations — translate audio in any supported language into
 * English text. Same file-or-url duality as `audio-transcribe` (see there for
 * why both are exposed); `language` is not a parameter here because the
 * output is always English.
 */
const audioTranslate: ActionDefinition<Input> = {
  key: "audio-translate",
  type: "perform",
  resource: "audio",
  title: "Translate Audio",
  description: "Translate audio into English text.",
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
    { key: "prompt", label: "Prompt", type: "text", hint: "Should be in English." },
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
    { key: "fileName", label: "File name", type: "string", default: "audio.mp3" },
    { key: "fileMimeType", label: "File MIME type", type: "string", default: "audio/mpeg" },
  ],
  output: [
    { key: "text", type: "string", label: "Translated text" },
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
    if (input.prompt) form.append("prompt", input.prompt);
    form.append("response_format", input.responseFormat ?? "json");
    if (input.temperature !== undefined) form.append("temperature", String(input.temperature));

    return client.request("/audio/translations", { method: "POST", form });
  },
};

export default audioTranslate;
