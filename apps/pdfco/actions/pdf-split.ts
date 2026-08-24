import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /v1/pdf/split` — split by page ranges (each range becomes one output
 * PDF). Uses the SAME 0-based `pages` convention as most of the surface —
 * unlike `pdf-edit/delete-pages`, which is documented 1-based. See
 * `lib/client.ts`'s module doc.
 */
interface Input {
  url: string;
  pages?: string;
  inline?: boolean;
  name?: string;
  async?: boolean;
  password?: string;
  expiration?: number;
  profiles?: unknown;
  httpusername?: string;
  httppassword?: string;
}

interface Output {
  urls?: string[];
  pageCount?: number;
  jobId?: string;
}

const pdfSplit: ActionDefinition<Input, Output> = {
  key: "pdf-split",
  type: "perform",
  title: "Split PDF",
  description: "Split a PDF into multiple files by page ranges.",
  idempotent: false,
  params: [
    urlParam(),
    {
      key: "pages",
      label: "Split ranges",
      type: "string",
      default: "1-2,3-",
      hint: "0-based page indices/ranges; each comma-separated group becomes one output file, " +
        'e.g. "1-2,3-" makes pages 1-2 one file and page 3 onward another.',
    },
    { key: "inline", label: "Return result inline", type: "boolean", default: true },
    passwordParam(),
    asyncParam(),
    nameParam("result.pdf"),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "urls", type: "array", label: "Output PDF URLs" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/split", compact({ ...input }));
  },
};

export default pdfSplit;
