import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/images/{id}` — poll until `status` is `completed` or `failed`.
 * Verified against `images/get-image-generation-status.md`.
 */
interface Input {
  imageGenerationId: string;
}

const getImageGenerationStatus: ActionDefinition<Input> = {
  key: "get-image-generation-status",
  type: "read",
  resource: "image",
  title: "Get Image Generation Status",
  description:
    "Poll an image generation job. When complete, the response includes the image URL, " +
    "dimensions, and savedMediaId for the workspace media library.",
  params: [
    { key: "imageGenerationId", label: "Image Generation ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "pending | completed | failed" },
    { key: "image", type: "object", label: "{ url, width, height, format, mimeType, ... }" },
    { key: "warnings", type: "array", label: "Warnings about how the request was interpreted" },
    { key: "error", type: "object", label: "{ message, statusCode } — when failed" },
    { key: "credits", type: "object", label: "{ deducted, remaining } — when completed" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/images/${encodeURIComponent(input.imageGenerationId)}`,
    );
  },
};

export default getImageGenerationStatus;
