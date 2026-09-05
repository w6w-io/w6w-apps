import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/censor-jobs` — bleep or mask flagged content in a clip.
 *
 * Answers the bare `CensorJobResponse` (`{jobId, message}`), no `data`
 * envelope — one of this API's two response shapes; see `lib/client.ts`.
 *
 * Not idempotent: each call starts a new asynchronous censor job.
 */
interface Input {
  projectId: string;
  clipId: string;
  beepSound?: boolean;
}

const censorJobCreate: ActionDefinition<Input> = {
  key: "censor-job-create",
  type: "perform",
  resource: "censor-job",
  title: "Create Censor Job",
  description: "Start an asynchronous job to bleep or mask flagged content in a clip.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "clipId", label: "Clip ID", type: "string", required: true },
    {
      key: "beepSound",
      label: "Use beep sound",
      type: "boolean",
      hint: "When off, flagged audio is masked/muted instead of beeped.",
    },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const body = compact({
      projectId: input.projectId,
      clipId: input.clipId,
      options: input.beepSound != null ? { beepSound: input.beepSound } : undefined,
    });
    return await new OpusClipClient(ctx).json("/api/censor-jobs", { method: "POST", body });
  },
};

export default censorJobCreate;
