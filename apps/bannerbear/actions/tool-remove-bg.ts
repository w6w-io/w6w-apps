import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  imageUrl: string;
  metadata?: string;
}

interface Outputs {
  image_url: string;
}

/** `POST /tools/remove_bg` — cut the subject out of an image onto a transparent background. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-remove-bg",
  type: "perform",
  resource: "tool",
  title: "Tool: Remove Background",
  description: "Cut the subject out of a PNG/JPG image against a transparent background.",
  idempotent: false,
  params: [
    { key: "imageUrl", label: "Image URL", type: "string", required: true },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const imageUrl = String(input.imageUrl ?? "").trim();
    if (!imageUrl) throw new Error("`imageUrl` is required");
    return runTool<Outputs>(ctx, "remove_bg", { image_url: imageUrl, metadata: input.metadata });
  },
};

export default action;
