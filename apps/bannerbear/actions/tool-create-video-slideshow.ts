import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  imageUrls: string;
  slideDuration?: number;
  transition?: string;
  transitionDuration?: number;
  width?: number;
  height?: number;
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

/** `POST /tools/create_video_slideshow` — turn a list of images into a video slideshow. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-create-video-slideshow",
  type: "perform",
  resource: "tool",
  title: "Tool: Create Video Slideshow",
  description: "Turn two or more images into a video slideshow with transitions.",
  idempotent: false,
  params: [
    {
      key: "imageUrls",
      label: "Image URLs",
      type: "text",
      required: true,
      hint: "One URL per line or comma-separated, in slide order. Two or more required.",
    },
    { key: "slideDuration", label: "Slide duration (s)", type: "number", default: 3 },
    { key: "transition", label: "Transition", type: "select", options: transitionOptions },
    { key: "transitionDuration", label: "Transition duration (s)", type: "number", advanced: true },
    { key: "width", label: "Width (px)", type: "number", default: 1280, advanced: true },
    { key: "height", label: "Height (px)", type: "number", default: 720, advanced: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const imageUrls = String(input.imageUrls ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (imageUrls.length < 2) throw new Error("`imageUrls` needs at least 2 URLs");
    return runTool<Outputs>(ctx, "create_video_slideshow", {
      image_urls: imageUrls,
      slide_duration: input.slideDuration,
      transition: input.transition,
      transition_duration: input.transitionDuration,
      width: input.width,
      height: input.height,
      metadata: input.metadata,
    });
  },
};

export default action;
