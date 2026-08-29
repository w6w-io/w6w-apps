import type { ActionDefinition } from "@w6w/types";
import { runTool, type ToolJob } from "../lib/tools.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  urls: string;
  metadata?: string;
}

interface Outputs {
  pdf_url: string;
}

/** `POST /tools/create_pdf` — combine JPG/PNG/PDF pages into one PDF, order preserved. */
const action: ActionDefinition<Input, ToolJob<Outputs>> = {
  key: "tool-create-pdf",
  type: "perform",
  resource: "tool",
  title: "Tool: Create PDF",
  description: "Combine JPG, PNG, or PDF pages into a single PDF, in the order given.",
  idempotent: false,
  params: [
    {
      key: "urls",
      label: "Page URLs",
      type: "text",
      required: true,
      hint: "One URL per line or comma-separated — JPG, PNG, or PDF. Order is preserved.",
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "Tool job UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const urls = String(input.urls ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) throw new Error("`urls` must contain at least one URL");
    return runTool<Outputs>(ctx, "create_pdf", { urls, metadata: input.metadata });
  },
};

export default action;
