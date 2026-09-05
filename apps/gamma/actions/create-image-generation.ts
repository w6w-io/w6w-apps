import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/images` — verified against `images/create-image-generation.md`.
 * Produces one standalone on-brand image, separate from a Gamma document.
 *
 * `referenceImages` (max 4) takes precedence over `type` and `themeId` per the
 * schema; exposed as JSON since each element is itself an object
 * (`{ url, role: "subject" }`).
 */
interface Input {
  prompt: string;
  type?: string;
  sizePreset?: string;
  themeId?: string;
  referenceImages?: unknown;
}

const createImageGeneration: ActionDefinition<Input> = {
  key: "create-image-generation",
  type: "perform",
  resource: "image",
  title: "Create Image Generation",
  description:
    "Generate a standalone on-brand image from a text prompt. Poll Get Image Generation " +
    "Status with the returned imageGenerationId.",
  idempotent: false,
  params: [
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: "Description of the image (up to 5,000 characters). Background treatments " +
        '("on white", "contained in a circle") go here.',
    },
    {
      key: "type",
      label: "Style",
      type: "select",
      options: [
        { value: "illustration", label: "Illustration (default)" },
        { value: "abstract", label: "Abstract" },
        { value: "photo", label: "Photo" },
        { value: "scene", label: "Scene" },
      ],
      hint: "Skipped when Reference Images are present — the references drive the look instead.",
      advanced: true,
    },
    {
      key: "sizePreset",
      label: "Size Preset",
      type: "select",
      options: [
        { value: "social-square", label: "Social square (1:1, default)" },
        { value: "social-portrait", label: "Social portrait" },
        { value: "banner", label: "Banner" },
        { value: "slide", label: "Slide" },
        { value: "story", label: "Story" },
      ],
      advanced: true,
    },
    {
      key: "themeId",
      label: "Theme ID",
      type: "string",
      hint: 'From the List Themes action. Ignored for the "scene" style and when Reference ' +
        "Images are present.",
      advanced: true,
    },
    {
      key: "referenceImages",
      label: "Reference Images (JSON)",
      type: "json",
      hint: 'Up to 4: [{ "url": "<an HTTPS image URL>", "role": "subject" }]. Takes precedence ' +
        "over Style and Theme ID.",
      advanced: true,
    },
  ],
  output: [
    { key: "imageGenerationId", type: "string", label: "Image Generation ID" },
    { key: "warnings", type: "array", label: "Warnings known at request time" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/images", {
      method: "POST",
      body: compact({
        prompt: input.prompt,
        type: input.type,
        sizePreset: input.sizePreset,
        themeId: input.themeId,
        referenceImages: input.referenceImages,
      }),
    });
  },
};

export default createImageGeneration;
