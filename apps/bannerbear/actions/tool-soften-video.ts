import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  strength?: string;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/** `POST /tools/soften_video` — apply smoothing/denoise to a video. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-soften-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Soften Video",
  description: "Apply smoothing/denoise to a video.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    {
      key: "strength",
      label: "Strength",
      type: "select",
      default: "medium",
      options: [
        { value: "subtle", label: "Subtle" },
        { value: "medium", label: "Medium" },
        { value: "strong", label: "Strong" },
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
    return runTool<Outputs>(ctx, "soften_video", {
      video_url: videoUrl,
      strength: input.strength ?? "medium",
      metadata: input.metadata,
    });
  },
};

export default action;
