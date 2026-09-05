import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/social-copy-jobs` — generate a title/description/hashtags for a
 * clip, tuned for a specific connected destination.
 *
 * `clipId` must be the BARE clip id (e.g. `CUexample1`) — not the composite
 * `{projectId}.{clipId}` form `clip-list` returns as `id`. Use `clip-list`'s
 * `curationId` field, per the vendor's own warning.
 *
 * Not idempotent by default: a repeat call without `forceRegenerate` may
 * return a cached result rather than a fresh one, but it is still, in the
 * vendor's own words, a job creation — so this is declared `false` rather
 * than assuming the cache always saves the call.
 */
interface Input {
  projectId: string;
  clipId: string;
  postAccountId: string;
  subAccountId?: string;
  prompt?: string;
  forceRegenerate?: boolean;
}

const socialCopyJobCreate: ActionDefinition<Input> = {
  key: "social-copy-job-create",
  type: "perform",
  resource: "social-copy-job",
  title: "Create Social Copy Job",
  description: "Generate platform-tuned post copy (title, description, hashtags) for a clip.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "clipId",
      label: "Clip ID",
      type: "string",
      required: true,
      hint: "Bare clip id, e.g. CUexample1 — not the {projectId}.{clipId} composite form.",
    },
    { key: "postAccountId", label: "Post account ID", type: "string", required: true },
    {
      key: "subAccountId",
      label: "Sub-account ID",
      type: "string",
      hint: "Required for Facebook pages, Instagram business accounts, and LinkedIn.",
    },
    {
      key: "prompt",
      label: "Tone / style prompt",
      type: "text",
      advanced: true,
      hint: 'Custom instruction, e.g. "playful and witty, ending with a call to action".',
    },
    {
      key: "forceRegenerate",
      label: "Force regenerate",
      type: "boolean",
      advanced: true,
      hint: "Bypass a cached result and generate fresh copy.",
    },
  ],
  output: [{ key: "jobId", type: "string", label: "Job ID" }],

  async execute(input, ctx) {
    const body = compact({
      projectId: input.projectId,
      clipId: input.clipId,
      postAccountId: input.postAccountId,
      subAccountId: input.subAccountId,
      prompt: input.prompt,
      forceRegenerate: input.forceRegenerate,
    });
    return await new OpusClipClient(ctx).data("/api/social-copy-jobs", { method: "POST", body });
  },
};

export default socialCopyJobCreate;
