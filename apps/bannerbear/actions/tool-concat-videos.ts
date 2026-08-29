import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrls: string;
  transition?: string;
  transitionDuration?: number;
  width?: number;
  height?: number;
  fps?: number;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

const transitionOptions = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipeleft", label: "Wipe left" },
  { value: "slideleft", label: "Slide left" },
];

/**
 * `POST /tools/concat_videos` — join two or more videos, in order, with an
 * optional transition. `width`/`height`/`fps` default to the first clip's own
 * (capped at 1920x1080/60fps) when left empty.
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-concat-videos",
  type: "perform",
  resource: "tool",
  title: "Tool: Concatenate Videos",
  description: "Join two or more videos end to end, with an optional transition.",
  idempotent: false,
  params: [
    {
      key: "videoUrls",
      label: "Video URLs",
      type: "text",
      required: true,
      hint: "One URL per line or comma-separated, in play order. Two or more required.",
    },
    { key: "transition", label: "Transition", type: "select", options: transitionOptions },
    { key: "transitionDuration", label: "Transition duration (s)", type: "number", advanced: true },
    { key: "width", label: "Width (px)", type: "number", advanced: true },
    { key: "height", label: "Height (px)", type: "number", advanced: true },
    { key: "fps", label: "Frame rate", type: "number", advanced: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrls = String(input.videoUrls ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (videoUrls.length < 2) throw new Error("`videoUrls` needs at least 2 URLs");
    return runTool<Outputs>(ctx, "concat_videos", {
      video_urls: videoUrls,
      transition: input.transition,
      transition_duration: input.transitionDuration,
      width: input.width,
      height: input.height,
      fps: input.fps,
      metadata: input.metadata,
    });
  },
};

export default action;
