import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  start: number;
  end: number;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/** `POST /tools/trim_video` — cut a video down to `[start, end]` seconds. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-trim-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Trim Video",
  description: "Cut a video down to a start/end time range.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "start", label: "Start (seconds)", type: "number", required: true },
    { key: "end", label: "End (seconds)", type: "number", required: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    if (input.start === undefined || input.end === undefined) {
      throw new Error("`start` and `end` are required");
    }
    return runTool<Outputs>(ctx, "trim_video", {
      video_url: videoUrl,
      start: input.start,
      end: input.end,
      metadata: input.metadata,
    });
  },
};

export default action;
