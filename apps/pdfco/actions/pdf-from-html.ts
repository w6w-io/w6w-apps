import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { asyncParam, expirationParam, nameParam, profilesParam } from "../lib/params.ts";

/**
 * `POST /v1/pdf/convert/from/html` — render raw HTML (with its JavaScript) to
 * PDF. Field casing (`paperSize`, `printBackground`, `mediaType`) verified
 * against the endpoint's own worked `curl` example, which round-trips —
 * openapi.json's lowercased `papersize`/`printbackground`/`mediatype` do not.
 * Only `html` is required: openapi.json's `required: ["html", "templateid"]`
 * is wrong (the vendor's own example omits `templateid` entirely).
 */
interface Input {
  html: string;
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
}

interface Output {
  url?: string;
  pageCount?: number;
  jobId?: string;
}

const pdfFromHtml: ActionDefinition<Input, Output> = {
  key: "pdf-from-html",
  type: "perform",
  title: "Convert HTML to PDF",
  description: "Render raw HTML (including any JavaScript it triggers on load) to a PDF file.",
  idempotent: false,
  params: [
    { key: "html", label: "HTML", type: "text", required: true },
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
      hint: 'Standard size, or a custom "{width} {height}" with px/mm/cm/in units.',
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
    {
      key: "margins",
      label: "Margins",
      type: "string",
      advanced: true,
      hint: '"{top} {right} {bottom} {left}", e.g. "10px 10px 10px 10px".',
    },
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
  ],
  output: [
    { key: "url", type: "string", label: "Output PDF URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/convert/from/html", compact({ ...input }));
  },
};

export default pdfFromHtml;
