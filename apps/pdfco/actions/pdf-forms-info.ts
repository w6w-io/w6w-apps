import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { asyncParam, passwordParam, profilesParam, urlParam } from "../lib/params.ts";

/**
 * `POST /v1/pdf/info/fields` — fillable field names/positions (text boxes,
 * checkboxes, radio buttons, combo boxes), for use with `pdf-add`'s
 * `fields` parameter (fill-out mode) or `fieldsString`.
 */
interface Input {
  url: string;
  async?: boolean;
  password?: string;
  profiles?: unknown;
}

interface Output {
  info?: Record<string, unknown>;
  jobId?: string;
}

const pdfFormsInfo: ActionDefinition<Input, Output> = {
  key: "pdf-forms-info",
  type: "read",
  title: "Get PDF Form Fields",
  description: "List fillable form fields (text boxes, checkboxes, radio buttons, combo boxes) " +
    "in a PDF form, for use with the PDF Add action.",
  params: [urlParam(), passwordParam(), asyncParam(), profilesParam()],
  output: [{ key: "info", type: "object", label: "Form field info" }],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/info/fields", compact({ ...input }));
  },
};

export default pdfFormsInfo;
