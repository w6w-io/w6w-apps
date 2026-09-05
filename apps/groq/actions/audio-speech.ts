import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: string;
  voice: string;
  responseFormat?: "flac" | "mp3" | "mulaw" | "ogg" | "wav";
  sampleRate?: 8000 | 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
  speed?: number;
}

/**
 * POST /audio/speech — text-to-speech. This endpoint has no OpenAI-app
 * sibling in this pack (OpenAI's own TTS lives at the same path but this app
 * models Groq's copy independently) and answers with a raw binary body
 * (`audio/wav` by default) rather than a JSON envelope, so it goes through
 * `GroqClient.requestBinary` and comes back base64-encoded.
 */
const audioSpeech: ActionDefinition<Input> = {
  key: "audio-speech",
  type: "perform",
  resource: "audio",
  title: "Create Speech",
  description: "Generate audio from input text.",
  idempotent: false,
  params: [
    { key: "model", label: "Model", type: "string", required: true },
    { key: "input", label: "Text", type: "text", required: true },
    {
      key: "voice",
      label: "Voice",
      type: "string",
      required: true,
      hint: "See console.groq.com/docs/text-to-speech for the voices available per model.",
    },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      default: "mp3",
      options: [
        { value: "flac", label: "FLAC" },
        { value: "mp3", label: "MP3" },
        { value: "mulaw", label: "mu-law" },
        { value: "ogg", label: "OGG" },
        { value: "wav", label: "WAV" },
      ],
    },
    {
      key: "sampleRate",
      label: "Sample rate (Hz)",
      type: "select",
      default: 48000,
      options: [8000, 16000, 22050, 24000, 32000, 44100, 48000].map((v) => ({
        value: v,
        label: String(v),
      })),
    },
    { key: "speed", label: "Speed", type: "number", default: 1 },
  ],
  output: [
    { key: "base64", type: "string", label: "Audio (base64)" },
    { key: "contentType", type: "string", label: "Content type" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      input: input.input,
      voice: input.voice,
    };
    if (input.responseFormat !== undefined) body.response_format = input.responseFormat;
    if (input.sampleRate !== undefined) body.sample_rate = input.sampleRate;
    if (input.speed !== undefined) body.speed = input.speed;

    return client.requestBinary("/audio/speech", { method: "POST", body });
  },
};

export default audioSpeech;
