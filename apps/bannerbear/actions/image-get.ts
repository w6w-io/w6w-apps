import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface ImageResult {
  uid: string;
  status: "pending" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  metadata?: string | null;
  error?: string | null;
  self?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface Input {
  uid: string;
}

/** `GET /images/{uid}` — poll a render started by `image-create`. */
const action: ActionDefinition<Input, ImageResult> = {
  key: "image-get",
  type: "read",
  resource: "image",
  title: "Get Image",
  description: "Poll an image render's status and output files.",
  params: [
    { key: "uid", label: "Image UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "files", type: "object", label: "Output files by format" },
    { key: "error", type: "string", label: "Error (on failure)" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<ImageResult>(`/images/${encodeURIComponent(uid)}`);
  },
};

export default action;
