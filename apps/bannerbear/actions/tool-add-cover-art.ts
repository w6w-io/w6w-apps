import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  imageUrl: string;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/** `POST /tools/add_cover_art` — set a video's poster/thumbnail frame. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-add-cover-art",
  type: "perform",
  resource: "tool",
  title: "Tool: Add Cover Art",
  description: "Set a video's poster/thumbnail image.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "imageUrl", label: "Cover image URL", type: "string", required: true },
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
    return runTool<Outputs>(ctx, "add_cover_art", {
      video_url: videoUrl,
      image_url: imageUrl,
      metadata: input.metadata,
    });
  },
};

export default action;
