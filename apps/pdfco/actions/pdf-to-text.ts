import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  inlineParam,
  nameParam,
  pagesParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /v1/pdf/convert/to/text` — OCR-aware, layout-preserving text
 * extraction. Field casing verified against the endpoint's own Markdown
 * table (`lineGrouping`, not openapi.json's `linegrouping`).
 */
interface Input {
  url: string;
  lang?: string;
  rect?: string;
  unwrap?: boolean;
  lineGrouping?: string;
  inline?: boolean;
  pages?: string;
  name?: string;
  async?: boolean;
  password?: string;
  expiration?: number;
  profiles?: unknown;
  httpusername?: string;
  httppassword?: string;
}

interface Output {
  url?: string;
  body?: string;
  pageCount?: number;
  name?: string;
  credits?: number;
  remainingCredits?: number;
  jobId?: string;
}

const pdfToText: ActionDefinition<Input, Output> = {
  key: "pdf-to-text",
  type: "read",
  title: "Convert PDF to Text",
  description: "Extract text from a PDF (or scanned image) with layout preserved, using OCR.",
  params: [
    urlParam(),
    {
      ...inlineParam(true),
      hint: "When true (default here), the extracted text is returned inline as `body`.",
    },
    pagesParam(false),
    {
      key: "lang",
      label: "OCR language",
      type: "string",
      default: "eng",
      advanced: true,
      hint: 'Tesseract language code(s) for scanned input, e.g. "eng" or "eng+deu".',
    },
    {
      key: "rect",
      label: "Extraction rectangle",
      type: "string",
      advanced: true,
      hint: '"{x} {y} {width} {height}" to extract from a specific region only.',
    },
    {
      key: "lineGrouping",
      label: "Line grouping mode",
      type: "select",
      advanced: true,
      options: [
        { value: "1", label: "1 — group by rows" },
        { value: "2", label: "2 — group by columns" },
        { value: "3", label: "3 — join orphaned rows" },
      ],
    },
    {
      key: "unwrap",
      label: "Unwrap wrapped lines",
      type: "boolean",
      advanced: true,
      hint: "Only applies when line grouping mode 1 is set.",
    },
    passwordParam(),
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "body", type: "string", label: "Extracted text" },
    { key: "url", type: "string", label: "Output file URL" },
    { key: "pageCount", type: "number", label: "Page count" },
    { key: "jobId", type: "string", label: "Background job id (when async)" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>(
      "/v1/pdf/convert/to/text",
      compact({ ...input }),
    );
  },
};

export default pdfToText;
