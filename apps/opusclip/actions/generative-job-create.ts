import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/generative-jobs` — generate thumbnail options for a video.
 *
 * Experimental, per the vendor's own description: subject to change, daily
 * caps apply, and the endpoint may be temporarily disabled via a runtime kill
 * switch. Currently the only published `jobType` is `thumbnail` (7
 * credits/call, charged on success and refunded on failure).
 *
 * `referenceImageUri`/`maskImageUri` must already be hosted URLs (the vendor's
 * own upload endpoint, `POST /api/upload-links`, is not itself documented in
 * the OpenAPI reference this app was built from, so uploading through this
 * app is not supported — pass a URL you already have).
 *
 * Not idempotent: starts a new job, every call, and spends credits on success.
 */
interface Input {
  sourceUri: string;
  referenceImageUri?: string;
  maskImageUri?: string;
  prompt?: string;
}

const generativeJobCreate: ActionDefinition<Input> = {
  key: "generative-job-create",
  type: "perform",
  resource: "generative-job",
  title: "Create Thumbnail Generation Job",
  description: "Experimental. Generate thumbnail options for a video. 7 credits per call, " +
    "charged on success and refunded on failure.",
  idempotent: false,
  params: [
    { key: "sourceUri", label: "Source video URL", type: "string", required: true },
    {
      key: "referenceImageUri",
      label: "Reference image URL",
      type: "string",
      advanced: true,
      hint: "The thumbnail composition draws stylistic cues from this image.",
    },
    {
      key: "maskImageUri",
      label: "Mask image URL",
      type: "string",
      advanced: true,
      hint: "For inpainting.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      advanced: true,
      hint: 'Text steering the thumbnail composition, e.g. "punchy red overlay, bold ' +
        'sans-serif title".',
    },
  ],
  output: [{ key: "jobId", type: "string", label: "Job ID" }],

  async execute(input, ctx) {
    const body = compact({
      jobType: "thumbnail",
      sourceUri: input.sourceUri,
      referenceImageUri: input.referenceImageUri,
      maskImageUri: input.maskImageUri,
      prompt: input.prompt,
    });
    return await new OpusClipClient(ctx).json("/api/generative-jobs", { method: "POST", body });
  },
};

export default generativeJobCreate;
