import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  text: string;
  voice?: string;
  metadata?: string;
}

interface Outputs {
  audio_url: string;
}

/** `POST /tools/generate_voiceover` — text-to-speech via a pre-made ElevenLabs voice. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-generate-voiceover",
  type: "perform",
  resource: "tool",
  title: "Tool: Generate Voiceover",
  description: "Text-to-speech, up to 2000 characters, via a pre-made ElevenLabs voice.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Up to 2000 characters.",
    },
    {
      key: "voice",
      label: "Voice",
      type: "select",
      default: "rachel",
      options: [
        { value: "rachel", label: "Rachel" },
        { value: "adam", label: "Adam" },
        { value: "antoni", label: "Antoni" },
        { value: "bella", label: "Bella" },
        { value: "domi", label: "Domi" },
        { value: "elli", label: "Elli" },
        { value: "josh", label: "Josh" },
        { value: "arnold", label: "Arnold" },
        { value: "charlie", label: "Charlie" },
        { value: "freya", label: "Freya" },
      ],
      hint: "Rachel and Adam are the vendor's own recommended safe defaults.",
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const text = String(input.text ?? "").trim();
    if (!text) throw new Error("`text` is required");
    return runTool<Outputs>(ctx, "generate_voiceover", {
      text,
      voice: input.voice,
      metadata: input.metadata,
    });
  },
};

export default action;
