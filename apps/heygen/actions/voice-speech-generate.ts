import type { ActionDefinition } from "@w6w/types";
import { compact, HeyGenClient } from "../lib/client.ts";

interface Input {
  text: string;
  voiceId: string;
  inputType?: "text" | "ssml";
  speed?: number;
  language?: string;
  locale?: string;
}

/**
 * `POST /v3/voices/speech` — text-to-speech via HeyGen's "Starfish" TTS engine. Synchronous: the
 * response carries a ready-to-use `audio_url` directly, unlike every video-generation endpoint in
 * this app. The voice must support the `starfish` engine — filter `voice-list` with
 * `engine=starfish` first.
 */
const voiceSpeechGenerate: ActionDefinition<Input> = {
  key: "voice-speech-generate",
  type: "perform",
  resource: "voice",
  title: "Generate Speech",
  description:
    "Synthesize speech audio from text (1-5,000 characters) using a Starfish-engine voice. " +
    "Returns immediately with a URL to the generated audio file.",
  idempotent: false,
  params: [
    { key: "text", label: "Text", type: "text", required: true, hint: "1-5,000 characters." },
    {
      key: "voiceId",
      label: "Voice ID",
      type: "string",
      required: true,
      hint: "Must support the starfish engine — filter List Voices with engine=starfish.",
    },
    {
      key: "inputType",
      label: "Input type",
      type: "select",
      default: "text",
      options: [{ value: "text", label: "Plain text" }, { value: "ssml", label: "SSML" }],
    },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 1,
      validation: { min: 0.5, max: 2 },
      hint: "0.5x-2.0x.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint: "e.g. 'en', 'pt'. Auto-detected from text when omitted.",
    },
    { key: "locale", label: "Locale", type: "string", hint: "BCP-47, e.g. 'en-US'." },
  ],
  output: [
    { key: "audio_url", type: "string", label: "Generated audio URL" },
    { key: "duration", type: "number", label: "Audio duration (seconds)" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data("/v3/voices/speech", {
      method: "POST",
      body: compact({
        text: input.text,
        voice_id: input.voiceId,
        input_type: input.inputType,
        speed: input.speed,
        language: input.language,
        locale: input.locale,
      }),
    });
  },
};

export default voiceSpeechGenerate;
