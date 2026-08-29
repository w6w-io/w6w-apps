import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  audioUrl: string;
  mode?: string;
  volume?: number;
  loop?: boolean;
  ducking?: string;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/**
 * `POST /tools/add_audio` — add or replace a video's audio track. `ducking`
 * only applies in `mix` mode (dips the new track when the video's original
 * audio is present).
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-add-audio",
  type: "perform",
  resource: "tool",
  title: "Tool: Add Audio",
  description: "Mix in or replace a video's audio track.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "audioUrl", label: "Audio URL", type: "string", required: true },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "mix",
      options: [
        { value: "mix", label: "Mix with existing audio" },
        { value: "replace", label: "Replace existing audio" },
      ],
    },
    { key: "volume", label: "Volume", type: "number", default: 1, hint: "1.0 = original level." },
    {
      key: "loop",
      label: "Loop to match video length",
      type: "boolean",
      default: true,
      hint: "Turn off for one-shot sounds.",
    },
    {
      key: "ducking",
      label: "Ducking",
      type: "select",
      default: "off",
      advanced: true,
      hint: "Mix mode only.",
      options: [
        { value: "off", label: "Off" },
        { value: "subtle", label: "Subtle" },
        { value: "medium", label: "Medium" },
        { value: "heavy", label: "Heavy" },
      ],
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    const audioUrl = String(input.audioUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    if (!audioUrl) throw new Error("`audioUrl` is required");
    return runTool<Outputs>(ctx, "add_audio", {
      video_url: videoUrl,
      audio_url: audioUrl,
      mode: input.mode ?? "mix",
      volume: input.volume,
      loop: input.loop === false ? "off" : input.loop === true ? "on" : undefined,
      ducking: input.ducking,
      metadata: input.metadata,
    });
  },
};

export default action;
