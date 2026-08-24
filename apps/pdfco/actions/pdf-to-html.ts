import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  nameParam,
  pagesParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/convert/to/html` — PDF to HTML. */
interface Input {
  url: string;
  lang?: string;
  rect?: string;
  inline?: boolean;
  pages?: string;
  name?: string;
  async?: boolean;
  password?: string;
  expiration?: number;
  profiles?: unknown;
  simple?: boolean;
  columns?: boolean;
}

interface Output {
  url?: string;
  body?: string;
  pageCount?: number;
  jobId?: string;
}

const pdfToHtml: ActionDefinition<Input, Output> = {
  key: "pdf-to-html",
  type: "read",
  title: "Convert PDF to HTML",
  description: "Convert a PDF into an HTML document.",
  params: [
    urlParam(),
    {
      key: "inline",
      label: "Return result inline",
      type: "boolean",
      default: true,
      hint: "When true (default), the HTML is returned inline as `body`.",
    },
    pagesParam(false),
    {
      key: "simple",
      label: "Simple layout",
      type: "boolean",
      advanced: true,
      hint: "Simpler HTML output, without exact positioning.",
    },
    { key: "columns", label: "Preserve columns", type: "boolean", advanced: true },
    { key: "lang", label: "OCR language", type: "string", default: "eng", advanced: true },
    {
      key: "rect",
      label: "Extraction rectangle",
      type: "string",
      advanced: true,
      hint: '"{x} {y} {width} {height}" to extract from a specific region only.',
    },
    passwordParam(),
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
  ],
  output: [
    { key: "body", type: "string", label: "HTML" },
    { key: "url", type: "string", label: "Output file URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/convert/to/html", compact({ ...input }));
  },
};

export default pdfToHtml;
