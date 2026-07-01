import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  prompt: string;
  model?: string;
  n?: number;
  size?: string;
  quality?: "standard" | "hd";
  style?: "natural" | "vivid";
  responseFormat?: "url" | "b64_json";
  user?: string;
}

const imageGenerate: ActionDefinition<Input> = {
  key: "image-generate",
  type: "perform",
  resource: "image",
  title: "Generate Image",
  description: "Create an image from a text prompt (DALL-E).",
  params: [
    { key: "prompt", label: "Prompt", type: "text", required: true },
    { key: "model", label: "Model", type: "string", default: "dall-e-3" },
    { key: "n", label: "Number of images", type: "number", default: 1 },
    { key: "size", label: "Size", type: "string", default: "1024x1024" },
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "hd", label: "HD" },
      ],
    },
    {
      key: "style",
      label: "Style",
      type: "select",
      options: [
        { value: "natural", label: "Natural" },
        { value: "vivid", label: "Vivid" },
      ],
    },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      default: "url",
      options: [
        { value: "url", label: "URL" },
        { value: "b64_json", label: "Base64 JSON" },
      ],
    },
    { key: "user", label: "User", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      model: input.model ?? "dall-e-3",
      n: input.n ?? 1,
      size: input.size ?? "1024x1024",
      response_format: input.responseFormat ?? "url",
    };
    if (input.quality !== undefined) body.quality = input.quality;
    if (input.style !== undefined) body.style = input.style;
    if (input.user !== undefined) body.user = input.user;

    return client.request("/images/generations", { method: "POST", body });
  },
};

export default imageGenerate;
