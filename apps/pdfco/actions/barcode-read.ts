import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { asyncParam, httpAuthParams, pagesParam, profilesParam, urlParam } from "../lib/params.ts";

/**
 * `POST /v1/barcode/read/from/url` — detect and decode barcodes in a
 * PDF/image. Does NOT send `type`: the endpoint's own Markdown table marks a
 * `type` field "Required: Yes, default QRCode" (copy-pasted from the
 * `generate` endpoint's row), but the vendor's own worked example calls this
 * endpoint with only `url`, `types` (plural) and `async`, and gets back
 * barcodes of several different types in one response — so `type` singular
 * is not sent here, only the documented, optional `types` filter.
 */
interface Input {
  url: string;
  types?: string;
  pages?: string;
  async?: boolean;
  profiles?: unknown;
  httpusername?: string;
  httppassword?: string;
}

interface Barcode {
  Value?: string;
  Type?: number;
  TypeName?: string;
  Page?: number;
  Rect?: string;
  Confidence?: number;
}

interface Output {
  barcodes?: Barcode[];
  pageCount?: number;
  jobId?: string;
}

const barcodeRead: ActionDefinition<Input, Output> = {
  key: "barcode-read",
  type: "read",
  title: "Read Barcodes",
  description: "Detect and decode barcodes (QR, PDF417, Code128, EAN, UPC, …) in a PDF or image.",
  params: [
    urlParam(),
    {
      key: "types",
      label: "Barcode types to look for",
      type: "string",
      advanced: true,
      hint: 'Comma-separated barcode type names, e.g. "QRCode,Code128". Leave empty to detect ' +
        "any supported type.",
    },
    pagesParam(false),
    asyncParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "barcodes", type: "array", label: "Barcodes found" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/barcode/read/from/url", compact({ ...input }));
  },
};

export default barcodeRead;
