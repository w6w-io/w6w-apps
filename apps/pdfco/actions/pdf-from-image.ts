import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  profilesParam,
} from "../lib/params.ts";

/**
 * `POST /pdf/convert/from/image` (no `/v1` in the endpoint's own doc anchor,
 * but the real path — confirmed against openapi.json and the sitemap — is
 * `/v1/pdf/convert/from/image`). Multiple images can be combined into one
 * PDF by comma-separating `url`.
 */
interface Input {
  url: string;
  pages?: string;
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

const pdfFromImage: ActionDefinition<Input, Output> = {
  key: "pdf-from-image",
  type: "perform",
  title: "Convert Image to PDF",
  description: "Convert one or more images (JPG, PNG, TIFF, …) into a PDF file.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Image URL(s)",
      type: "string",
      required: true,
      hint: "One URL, or several comma-separated to combine into a single multi-page PDF.",
    },
    {
      key: "pages",
      label: "TIFF pages",
      type: "string",
      advanced: true,
      hint:
        'For multi-page TIFF input: 0-based page indices/ranges, e.g. "0,1,2-". All pages by default.',
    },
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
    return await client.post<Output>("/v1/pdf/convert/from/image", compact({ ...input }));
  },
};

export default pdfFromImage;
