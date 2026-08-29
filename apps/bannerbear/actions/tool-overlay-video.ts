import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  baseVideoUrl: string;
  overlayVideoUrl: string;
  position?: string;
  margin?: number;
  x?: number;
  y?: number;
  scale?: number;
  start?: number;
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
 * `POST /tools/overlay_video` — picture-in-picture: composite one video on
 * top of another. `position` and `x`/`y` are mutually exclusive — set one or
 * the other, per the vendor's own description.
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-overlay-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Overlay Video",
  description: "Composite one video on top of another (picture-in-picture).",
  idempotent: false,
  params: [
    { key: "baseVideoUrl", label: "Base video URL", type: "string", required: true },
    { key: "overlayVideoUrl", label: "Overlay video URL", type: "string", required: true },
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
    { key: "scale", label: "Scale", type: "number", advanced: true, hint: "1.0 = original size." },
    { key: "start", label: "Start (seconds)", type: "number", advanced: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const baseVideoUrl = String(input.baseVideoUrl ?? "").trim();
    const overlayVideoUrl = String(input.overlayVideoUrl ?? "").trim();
    if (!baseVideoUrl) throw new Error("`baseVideoUrl` is required");
    if (!overlayVideoUrl) throw new Error("`overlayVideoUrl` is required");
    return runTool<Outputs>(ctx, "overlay_video", {
      base_video_url: baseVideoUrl,
      overlay_video_url: overlayVideoUrl,
      position: input.position,
      margin: input.margin,
      x: input.x,
      y: input.y,
      scale: input.scale,
      start: input.start,
      metadata: input.metadata,
    });
  },
};

export default action;
