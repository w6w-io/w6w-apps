import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  pagesParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/convert/to/json2` — structured text + layout as JSON. */
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
  body?: unknown;
  pageCount?: number;
  jobId?: string;
}

const pdfToJson: ActionDefinition<Input, Output> = {
  key: "pdf-to-json",
  type: "read",
  title: "Convert PDF to JSON",
  description: "Extract text and layout from a PDF as structured JSON (lines, positions, fonts).",
  params: [
    urlParam(),
    {
      key: "inline",
      label: "Return result inline",
      type: "boolean",
      default: true,
      hint: "When true (default), the JSON structure is returned inline.",
    },
    pagesParam(false),
    {
      key: "lang",
      label: "OCR language",
      type: "string",
      default: "eng",
      advanced: true,
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
    { key: "unwrap", label: "Unwrap wrapped lines", type: "boolean", advanced: true },
    passwordParam(),
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "body", type: "object", label: "Structured JSON" },
    { key: "url", type: "string", label: "Output file URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/convert/to/json2", compact({ ...input }));
  },
};

export default pdfToJson;
