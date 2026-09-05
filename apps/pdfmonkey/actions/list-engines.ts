import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

type Input = Record<string, never>;

interface Engine {
  id?: string;
  name?: string;
  deprecated_on?: string | null;
}

interface Meta {
  current_page?: number;
  next_page?: number | null;
  prev_page?: number | null;
  total_pages?: number;
}

interface Output {
  pdf_engines: Engine[];
  meta: Meta;
}

/**
 * `GET /api/v1/engines` — the PDF engines available for `pdf_engine_id` /
 * `pdf_engine_draft_id` when creating or updating a template. The vendor
 * recommends the latest engine ("v4" at time of writing) for new templates.
 */
const listEngines: ActionDefinition<Input, Output> = {
  key: "list-engines",
  type: "read",
  resource: "engine",
  title: "List PDF Engines",
  description: "List the PDF engines available for template generation.",
  params: [],
  output: [
    { key: "pdf_engines", type: "array", label: "PDF engines" },
  ],

  execute(_input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    return client.request<Output>("/engines");
  },
};

export default listEngines;
