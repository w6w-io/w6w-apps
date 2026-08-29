import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/** `POST /tools/crop_video` — pixel-exact crop rectangle from the top-left corner. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-crop-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Crop Video",
  description: "Crop a video to a pixel-exact rectangle.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "x", label: "X (px)", type: "number", required: true },
    { key: "y", label: "Y (px)", type: "number", required: true },
    { key: "width", label: "Width (px)", type: "number", required: true },
    { key: "height", label: "Height (px)", type: "number", required: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    if (
      input.x === undefined || input.y === undefined || input.width === undefined ||
      input.height === undefined
    ) {
      throw new Error("`x`, `y`, `width` and `height` are required");
    }
    return runTool<Outputs>(ctx, "crop_video", {
      video_url: videoUrl,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      metadata: input.metadata,
    });
  },
};

export default action;
