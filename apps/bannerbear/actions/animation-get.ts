import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface AnimationResult {
  uid: string;
  status: "queued" | "rendering" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  progress?: number;
  metadata?: string | null;
  error?: string | null;
  self?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface Input {
  uid: string;
}

/** `GET /animations/{uid}` — poll a render started by `animation-create`, with live progress. */
const action: ActionDefinition<Input, AnimationResult> = {
  key: "animation-get",
  type: "read",
  resource: "animation",
  title: "Get Animation",
  description: "Poll an animation render's status, progress, and output files.",
  params: [
    { key: "uid", label: "Animation UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "progress", type: "number", label: "Progress (0-100)" },
    { key: "files", type: "object", label: "Output files by format" },
    { key: "error", type: "string", label: "Error (on failure)" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<AnimationResult>(
      `/animations/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
