import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  fps?: number;
  width?: number;
  duration?: number;
  metadata?: string;
}

interface Outputs {
  gif_url: string;
}

/** `POST /tools/create_gif_preview` — an animated GIF preview of a video's first few seconds. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-create-gif-preview",
  type: "perform",
  resource: "tool",
  title: "Tool: Create GIF Preview",
  description: "Make an animated GIF preview of the start of a video.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    {
      key: "fps",
      label: "Frame rate",
      type: "number",
      default: 8,
      hint: "Up to 8.",
      validation: { integer: true, min: 1, max: 8 },
    },
    {
      key: "width",
      label: "Width (px)",
      type: "number",
      hint: "Up to 480. Height follows the source's aspect ratio.",
      validation: { integer: true, min: 1, max: 480 },
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      default: 5,
      hint: "Trim to this many seconds from the start. Up to 5.",
      validation: { min: 0, max: 5 },
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    return runTool<Outputs>(ctx, "create_gif_preview", {
      video_url: videoUrl,
      fps: input.fps,
      width: input.width,
      duration: input.duration,
      metadata: input.metadata,
    });
  },
};

export default action;
