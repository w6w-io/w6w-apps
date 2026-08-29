import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  width: number;
  height: number;
  fit?: string;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/** `POST /tools/resize_video`. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-resize-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Resize Video",
  description: "Resize a video to exact dimensions.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "width", label: "Width (px)", type: "number", required: true },
    { key: "height", label: "Height (px)", type: "number", required: true },
    {
      key: "fit",
      label: "Fit",
      type: "select",
      hint: "cover crops, contain letterboxes, blur fills the bars with a blurred copy.",
      options: [
        { value: "cover", label: "Cover (crop)" },
        { value: "contain", label: "Contain (letterbox)" },
        { value: "blur", label: "Blur-filled letterbox" },
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
    if (!videoUrl) throw new Error("`videoUrl` is required");
    if (input.width === undefined || input.height === undefined) {
      throw new Error("`width` and `height` are required");
    }
    return runTool<Outputs>(ctx, "resize_video", {
      video_url: videoUrl,
      width: input.width,
      height: input.height,
      fit: input.fit,
      metadata: input.metadata,
    });
  },
};

export default action;
