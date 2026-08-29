import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BannerbearClient, compact } from "../lib/client.ts";
import { animationFormatsParam, metadataParam, modificationsParam } from "../lib/params.ts";

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
  template: string;
  modifications?: unknown;
  formats?: string[];
  metadata?: string;
}

/**
 * `POST /animations` — render a video from an Animation Template. Always
 * async; there is no sync host equivalent for animations (only
 * `POST /images` has one). `modifications.template` can also carry `fps`
 * (24/30/60) and `transparent` (forces MOV output) — set those inside the
 * Modifications JSON, since they are template-level render overrides rather
 * than per-layer ones.
 */
const action: ActionDefinition<Input, AnimationResult> = {
  key: "animation-create",
  type: "perform",
  resource: "animation",
  title: "Create Animation",
  description:
    "Render a video from an Animation Template. Not idempotent — every call starts a new render.",
  idempotent: false,
  params: [
    { key: "template", label: "Template UID", type: "string", required: true },
    modificationsParam,
    animationFormatsParam,
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "progress", type: "number", label: "Progress (0-100)" },
    { key: "files", type: "object", label: "Output files by format" },
  ],

  async execute(input, ctx) {
    const template = String(input.template ?? "").trim();
    if (!template) throw new Error("`template` is required");

    return await new BannerbearClient(ctx).json<AnimationResult>("/animations", {
      method: "POST",
      body: compact({
        template,
        modifications: asOptionalJson(input.modifications, "modifications") ?? {},
        formats: input.formats,
        metadata: input.metadata,
      }),
    });
  },
};

export default action;
