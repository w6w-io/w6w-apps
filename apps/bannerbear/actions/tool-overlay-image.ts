import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  imageUrl: string;
  position?: string;
  margin?: number;
  x?: number;
  y?: number;
  opacity?: number;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

const positionOptions = [
  { value: "top_left", label: "Top left" },
  { value: "top_center", label: "Top center" },
  { value: "top_right", label: "Top right" },
  { value: "center", label: "Center" },
  { value: "bottom_left", label: "Bottom left" },
  { value: "bottom_center", label: "Bottom center" },
  { value: "bottom_right", label: "Bottom right" },
];

/**
 * `POST /tools/overlay_image` — burn a static image (e.g. a logo/watermark)
 * onto a video for its whole duration. `position` and `x`/`y` are mutually
 * exclusive.
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-overlay-image",
  type: "perform",
  resource: "tool",
  title: "Tool: Overlay Image",
  description: "Burn a static image (e.g. a watermark) onto a video.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "imageUrl", label: "Overlay image URL", type: "string", required: true },
    {
      key: "position",
      label: "Position",
      type: "select",
      options: positionOptions,
      hint: "Snap to a corner/edge. Use this OR x/y, not both.",
    },
    { key: "margin", label: "Margin (px)", type: "number", advanced: true },
    {
      key: "x",
      label: "X (px)",
      type: "number",
      advanced: true,
      hint: "Ignored when Position is set.",
    },
    {
      key: "y",
      label: "Y (px)",
      type: "number",
      advanced: true,
      hint: "Ignored when Position is set.",
    },
    { key: "opacity", label: "Opacity", type: "number", advanced: true, hint: "0.0 to 1.0." },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    const imageUrl = String(input.imageUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    if (!imageUrl) throw new Error("`imageUrl` is required");
    return runTool<Outputs>(ctx, "overlay_image", {
      video_url: videoUrl,
      image_url: imageUrl,
      position: input.position,
      margin: input.margin,
      x: input.x,
      y: input.y,
      opacity: input.opacity,
      metadata: input.metadata,
    });
  },
};

export default action;
