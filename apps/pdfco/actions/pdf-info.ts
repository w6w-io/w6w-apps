import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { asyncParam, passwordParam, profilesParam, urlParam } from "../lib/params.ts";

/**
 * `POST /v1/pdf/info` — page count, security permissions, and document
 * metadata (author, title, creation date, …). For fillable form fields use
 * `pdf-forms-info` instead.
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

const pdfInfo: ActionDefinition<Input, Output> = {
  key: "pdf-info",
  type: "read",
  title: "Get PDF Info",
  description: "Read page count, security permissions, and document metadata from a PDF.",
  params: [urlParam(), passwordParam(), asyncParam(), profilesParam()],
  output: [{ key: "info", type: "object", label: "Document info" }],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/info", compact({ ...input }));
  },
};

export default pdfInfo;
