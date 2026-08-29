import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  referenceImageUrl?: string;
  metadata?: string;
}

interface Outputs {
  image_url: string;
}

/**
 * `POST /tools/generate_ai_image` — text-to-image, not template-based.
 * Credit cost varies by `model`; `reference_image_url` is only honoured by
 * some models per the vendor's own description.
 */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-generate-ai-image",
  type: "perform",
  resource: "tool",
  title: "Tool: Generate AI Image",
  description: "Generate an image from a text prompt. Credit cost varies by model.",
  idempotent: false,
  params: [
    { key: "prompt", label: "Prompt", type: "text", required: true },
    {
      key: "model",
      label: "Model",
      type: "select",
      default: "flux_schnell",
      options: [
        { value: "flux_schnell", label: "Flux Schnell" },
        { value: "flux_1_1_pro", label: "Flux 1.1 Pro" },
        { value: "nano_banana", label: "Nano Banana" },
        { value: "gpt_image_2", label: "GPT Image 2" },
      ],
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      type: "select",
      default: "1:1",
      options: [
        { value: "1:1", label: "1:1 Square" },
        { value: "16:9", label: "16:9 Landscape" },
        { value: "9:16", label: "9:16 Portrait" },
        { value: "4:3", label: "4:3" },
        { value: "3:4", label: "3:4" },
      ],
    },
    {
      key: "referenceImageUrl",
      label: "Reference image URL",
      type: "string",
      advanced: true,
      hint: "Optional starting point — only honoured by some models.",
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const prompt = String(input.prompt ?? "").trim();
    if (!prompt) throw new Error("`prompt` is required");
    return runTool<Outputs>(ctx, "generate_ai_image", {
      prompt,
      model: input.model,
      aspect_ratio: input.aspectRatio,
      reference_image_url: input.referenceImageUrl,
      metadata: input.metadata,
    });
  },
};

export default action;
