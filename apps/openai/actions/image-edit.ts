import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, OpenAIClient } from "../lib/client.ts";

interface Input {
  image: string;
  prompt: string;
  mask?: string;
  model?: string;
  n?: number;
  size?: string;
  responseFormat?: "url" | "b64_json";
  user?: string;
  imageFileName?: string;
  maskFileName?: string;
}

/**
 * Multipart POST to /v1/images/edits. `image` and `mask` are base64-encoded PNG
 * strings from the caller; we wrap them in `Blob`s and let `fetch` set the
 * multipart boundary via `FormData`.
 */
const imageEdit: ActionDefinition<Input> = {
  key: "image-edit",
  type: "perform",
  resource: "image",
  title: "Edit Image",
  description: "Edit a PNG image with an optional mask and a text prompt.",
  params: [
    {
      key: "image",
      label: "Image (base64 PNG)",
      type: "text",
      required: true,
      hint: "Base64-encoded PNG under 4MB. Square, RGBA if a mask is supplied.",
    },
    { key: "prompt", label: "Prompt", type: "text", required: true },
    { key: "mask", label: "Mask (base64 PNG)", type: "text" },
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
    { key: "maskFileName", label: "Mask filename", type: "string", default: "mask.png" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const form = new FormData();
    form.append(
      "image",
      new Blob([base64ToBytes(input.image)], { type: "image/png" }),
      input.imageFileName ?? "image.png",
    );
    form.append("prompt", input.prompt);
    if (input.mask) {
      form.append(
        "mask",
        new Blob([base64ToBytes(input.mask)], { type: "image/png" }),
        input.maskFileName ?? "mask.png",
      );
    }
    form.append("model", input.model ?? "dall-e-2");
    form.append("n", String(input.n ?? 1));
    form.append("size", input.size ?? "1024x1024");
    form.append("response_format", input.responseFormat ?? "url");
    if (input.user) form.append("user", input.user);

    return client.request("/images/edits", { method: "POST", form });
  },
};

export default imageEdit;
