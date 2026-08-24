import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  inlineParam,
  pagesParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /v1/pdf/find` — locate text (optionally by regular expression) and
 * return match positions. `searchString` casing verified against this
 * endpoint's own Markdown table — openapi.json calls it `searchstring`.
 */
interface Input {
  url: string;
  searchString: string;
  regexSearch?: boolean;
  wordMatchingMode?: string;
  pages?: string;
  inline?: boolean;
  password?: string;
  async?: boolean;
  expiration?: number;
  profiles?: unknown;
  httpusername?: string;
  httppassword?: string;
}

interface Output {
  url?: string;
  body?: unknown;
  jobId?: string;
}

const pdfFind: ActionDefinition<Input, Output> = {
  key: "pdf-find",
  type: "read",
  title: "Find Text in PDF",
  description: "Search a PDF for text (or a regular expression) and return every match's " +
    "position and surrounding context.",
  params: [
    urlParam(),
    { key: "searchString", label: "Search text or pattern", type: "string", required: true },
    {
      key: "regexSearch",
      label: "Treat search text as a regular expression",
      type: "boolean",
      default: false,
    },
    {
      key: "wordMatchingMode",
      label: "Word matching mode",
      type: "select",
      advanced: true,
      options: [
        { value: "None", label: "None — exact string match" },
        { value: "SmartMatch", label: "SmartMatch — flexible word boundaries (default)" },
        { value: "ExactMatch", label: "ExactMatch — strict whole-word boundaries" },
      ],
    },
    pagesParam(false),
    inlineParam(true),
    passwordParam(),
    asyncParam(),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [{ key: "body", type: "array", label: "Matches found" }],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/find", compact({ ...input }));
  },
};

export default pdfFind;
