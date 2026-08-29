import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  videoUrl: string;
  language?: string;
  wordsPerSegment?: number;
  font?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: string;
  outlineWidth?: number;
  outlineColor?: string;
  shadowSize?: number;
  shadowColor?: string;
  backgroundStyle?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  metadata?: string;
}

interface Outputs {
  video_url: string;
}

/**
 * `POST /tools/subtitle_video` — auto-transcribe and burn in subtitles.
 * `alignment` uses the SSA/ASS numpad convention (`2` bottom-center is the
 * vendor's own default; `7`/`8`/`9` top row, `4`/`5`/`6` middle row,
 * `1`/`2`/`3` bottom row, left/center/right respectively) — reproduced
 * exactly rather than renamed, since that is the literal value the API
 * expects.
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-subtitle-video",
  type: "perform",
  resource: "tool",
  title: "Tool: Subtitle Video",
  description: "Auto-transcribe a video and burn in styled subtitles.",
  idempotent: false,
  params: [
    { key: "videoUrl", label: "Video URL", type: "string", required: true },
    {
      key: "language",
      label: "Language",
      type: "select",
      hint: "Leave empty to auto-detect — works well when the audio is clear.",
      options: [
        { value: "", label: "Auto-detect" },
        { value: "en", label: "English" },
        { value: "es", label: "Spanish" },
        { value: "fr", label: "French" },
        { value: "de", label: "German" },
        { value: "it", label: "Italian" },
        { value: "pt", label: "Portuguese" },
        { value: "nl", label: "Dutch" },
        { value: "ru", label: "Russian" },
        { value: "pl", label: "Polish" },
        { value: "tr", label: "Turkish" },
        { value: "ar", label: "Arabic" },
        { value: "hi", label: "Hindi" },
        { value: "zh", label: "Chinese" },
        { value: "ja", label: "Japanese" },
        { value: "ko", label: "Korean" },
        { value: "id", label: "Indonesian" },
        { value: "vi", label: "Vietnamese" },
        { value: "th", label: "Thai" },
      ],
    },
    {
      key: "wordsPerSegment",
      label: "Words per segment",
      type: "number",
      validation: { integer: true, min: 1, max: 10 },
      advanced: true,
    },
    {
      key: "font",
      label: "Font",
      type: "select",
      default: "inter",
      advanced: true,
      options: [
        "inter",
        "roboto",
        "open-sans",
        "noto-sans",
        "montserrat",
        "poppins",
        "bebas-neue",
        "anton",
        "oswald",
        "playfair-display",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "fontSize", label: "Font size", type: "number", default: 28, advanced: true },
    { key: "color", label: "Text color", type: "string", default: "#ffffff", advanced: true },
    { key: "bold", label: "Bold", type: "boolean", advanced: true },
    { key: "italic", label: "Italic", type: "boolean", advanced: true },
    {
      key: "alignment",
      label: "Alignment",
      type: "select",
      advanced: true,
      hint: "SSA/ASS numpad convention. Defaults to bottom center (2).",
      options: [
        { value: "7", label: "Top left" },
        { value: "8", label: "Top center" },
        { value: "9", label: "Top right" },
        { value: "4", label: "Middle left" },
        { value: "5", label: "Middle center" },
        { value: "6", label: "Middle right" },
        { value: "1", label: "Bottom left" },
        { value: "2", label: "Bottom center" },
        { value: "3", label: "Bottom right" },
      ],
    },
    { key: "outlineWidth", label: "Outline width", type: "number", default: 0, advanced: true },
    {
      key: "outlineColor",
      label: "Outline color",
      type: "string",
      default: "#000000",
      advanced: true,
    },
    { key: "shadowSize", label: "Shadow size", type: "number", default: 0, advanced: true },
    {
      key: "shadowColor",
      label: "Shadow color",
      type: "string",
      default: "#000000",
      advanced: true,
    },
    {
      key: "backgroundStyle",
      label: "Background style",
      type: "select",
      default: "none",
      advanced: true,
      options: [
        { value: "none", label: "None" },
        { value: "box", label: "Solid box" },
      ],
    },
    { key: "backgroundColor", label: "Background color", type: "string", advanced: true },
    {
      key: "backgroundOpacity",
      label: "Background opacity",
      type: "number",
      default: 100,
      advanced: true,
      hint: "0 fully transparent, 100 fully opaque.",
      validation: { integer: true, min: 0, max: 100 },
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
    return runTool<Outputs>(ctx, "subtitle_video", {
      video_url: videoUrl,
      language: input.language,
      words_per_segment: input.wordsPerSegment,
      font: input.font,
      font_size: input.fontSize,
      color: input.color,
      bold: input.bold === true ? "on" : undefined,
      italic: input.italic === true ? "on" : undefined,
      alignment: input.alignment,
      outline_width: input.outlineWidth,
      outline_color: input.outlineColor,
      shadow_size: input.shadowSize,
      shadow_color: input.shadowColor,
      background_style: input.backgroundStyle,
      background_color: input.backgroundColor,
      background_opacity: input.backgroundOpacity,
      metadata: input.metadata,
    });
  },
};

export default action;
