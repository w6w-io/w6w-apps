import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, OpenAIClient } from "../lib/client.ts";

interface Input {
  image: string;
  model?: string;
  n?: number;
  size?: string;
  responseFormat?: "url" | "b64_json";
  user?: string;
  imageFileName?: string;
}

const imageVariation: ActionDefinition<Input> = {
  key: "image-variation",
  type: "perform",
  resource: "image",
  title: "Create Image Variation",
  description: "Generate variations of a source PNG image (DALL-E 2).",
  params: [
    {
      key: "image",
      label: "Image (base64 PNG)",
      type: "text",
      required: true,
      hint: "Base64-encoded square PNG under 4MB.",
    },
    { key: "model", label: "Model", type: "string", default: "dall-e-2" },
    { key: "n", label: "Number of images", type: "number", default: 1 },
    { key: "size", label: "Size", type: "string", default: "1024x1024" },
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
    { key: "imageFileName", label: "Image filename", type: "string", default: "image.png" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const form = new FormData();
    form.append(
      "image",
      new Blob([base64ToBytes(input.image)], { type: "image/png" }),
      input.imageFileName ?? "image.png",
    );
    form.append("model", input.model ?? "dall-e-2");
    form.append("n", String(input.n ?? 1));
    form.append("size", input.size ?? "1024x1024");
    form.append("response_format", input.responseFormat ?? "url");
    if (input.user) form.append("user", input.user);

    return client.request("/images/variations", { method: "POST", form });
  },
};

export default imageVariation;
