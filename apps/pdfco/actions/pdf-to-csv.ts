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

/** `POST /v1/pdf/convert/to/csv` — table extraction as CSV. */
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
  jobId?: string;
}

const pdfToCsv: ActionDefinition<Input, Output> = {
  key: "pdf-to-csv",
  type: "read",
  title: "Convert PDF to CSV",
  description: "Extract tables from a PDF as CSV.",
  params: [
    urlParam(),
    {
      ...inlineParam(true),
      hint: "When true (default here), the CSV text is returned inline as `body`.",
    },
    pagesParam(false),
    { key: "lang", label: "OCR language", type: "string", default: "eng", advanced: true },
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
    { key: "body", type: "string", label: "CSV text" },
    { key: "url", type: "string", label: "Output file URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/convert/to/csv", compact({ ...input }));
  },
};

export default pdfToCsv;
