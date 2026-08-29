import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  filter?: string;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

const filterOptions = [
  "black-and-white",
  "sepia",
  "invert",
  "warm",
  "cool",
  "vivid",
  "muted",
  "dark-and-moody",
  "faded",
  "vintage",
  "cross-process",
  "teal-and-orange",
  "bleach-bypass",
].map((v) => ({ value: v, label: v.replace(/-/g, " ") }));

/** `POST /tools/apply_color_filter` — apply a preset colour grade to a video. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-apply-color-filter",
  type: "perform",
  resource: "tool",
  title: "Tool: Apply Color Filter",
  description: "Apply a preset colour grade to a video.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    { key: "filter", label: "Filter", type: "select", default: "vintage", options: filterOptions },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const videoUrl = String(input.videoUrl ?? "").trim();
    if (!videoUrl) throw new Error("`videoUrl` is required");
    return runTool<Outputs>(ctx, "apply_color_filter", {
      video_url: videoUrl,
      filter: input.filter ?? "vintage",
      metadata: input.metadata,
    });
  },
};

export default action;
