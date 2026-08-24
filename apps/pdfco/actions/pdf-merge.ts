import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  profilesParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/merge` — concatenate multiple PDFs (and encrypted/AES sources) into one. */
interface Input {
  url: string;
  async?: boolean;
  name?: string;
  expiration?: number;
  profiles?: unknown;
  httpusername?: string;
  httppassword?: string;
}

interface Output {
  url?: string;
  pageCount?: number;
  jobId?: string;
}

const pdfMerge: ActionDefinition<Input, Output> = {
  key: "pdf-merge",
  type: "perform",
  title: "Merge PDFs",
  description: "Combine two or more PDF files (in order) into one PDF.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "File URLs",
      type: "string",
      required: true,
      hint: "Comma-separated list of source PDF URLs, merged in the order given.",
    },
    asyncParam(),
    nameParam("result.pdf"),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "url", type: "string", label: "Output PDF URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/merge", compact({ ...input }));
  },
};

export default pdfMerge;
