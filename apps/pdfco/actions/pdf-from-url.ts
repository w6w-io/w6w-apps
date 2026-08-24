import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  profilesParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/convert/from/url` — render a live web page to PDF. */
interface Input {
  url: string;
  margins?: string;
  paperSize?: string;
  orientation?: string;
  printBackground?: boolean;
  mediaType?: string;
  header?: string;
  footer?: string;
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

const pdfFromUrl: ActionDefinition<Input, Output> = {
  key: "pdf-from-url",
  type: "perform",
  title: "Convert Web Page to PDF",
  description: "Render a publicly reachable web page (URL) to a PDF file.",
  idempotent: false,
  params: [
    { key: "url", label: "Page URL", type: "string", required: true },
    {
      key: "paperSize",
      label: "Paper size",
      type: "select",
      default: "A4",
      options: [
        { value: "A4", label: "A4" },
        { value: "Letter", label: "Letter" },
        { value: "Legal", label: "Legal" },
        { value: "Tabloid", label: "Tabloid" },
        { value: "Ledger", label: "Ledger" },
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      default: "Portrait",
      options: [
        { value: "Portrait", label: "Portrait" },
        { value: "Landscape", label: "Landscape" },
      ],
    },
    { key: "margins", label: "Margins", type: "string", advanced: true },
    {
      key: "printBackground",
      label: "Print background colors/images",
      type: "boolean",
      default: true,
    },
    {
      key: "mediaType",
      label: "CSS media type",
      type: "select",
      advanced: true,
      default: "print",
      options: [
        { value: "print", label: "print" },
        { value: "screen", label: "screen" },
        { value: "none", label: "none" },
      ],
    },
    { key: "header", label: "Header HTML", type: "text", advanced: true },
    { key: "footer", label: "Footer HTML", type: "text", advanced: true },
    asyncParam(),
    nameParam(),
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
    return await client.post<Output>("/v1/pdf/convert/from/url", compact({ ...input }));
  },
};

export default pdfFromUrl;
