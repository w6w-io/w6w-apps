import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, OpenAIClient } from "../lib/client.ts";

interface Input {
  file: string;
  model?: string;
  prompt?: string;
  responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  temperature?: number;
  fileName?: string;
  fileMimeType?: string;
}

const audioTranslate: ActionDefinition<Input> = {
  key: "audio-translate",
  type: "perform",
  resource: "audio",
  title: "Translate Audio",
  description: "Translate audio into English text.",
  params: [
    {
      key: "file",
      label: "Audio file (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded audio, max 25MB.",
    },
    { key: "model", label: "Model", type: "string", default: "whisper-1" },
    { key: "prompt", label: "Prompt", type: "text" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "text", label: "Text" },
        { value: "srt", label: "SRT" },
        { value: "verbose_json", label: "Verbose JSON" },
        { value: "vtt", label: "VTT" },
      ],
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "fileName", label: "File name", type: "string", default: "audio.mp3" },
    { key: "fileMimeType", label: "File MIME type", type: "string", default: "audio/mpeg" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], { type: input.fileMimeType ?? "audio/mpeg" }),
      input.fileName ?? "audio.mp3",
    );
    form.append("model", input.model ?? "whisper-1");
    if (input.prompt) form.append("prompt", input.prompt);
    form.append("response_format", input.responseFormat ?? "json");
    if (input.temperature !== undefined) form.append("temperature", String(input.temperature));

    return client.request("/audio/translations", { method: "POST", form });
  },
};

export default audioTranslate;
