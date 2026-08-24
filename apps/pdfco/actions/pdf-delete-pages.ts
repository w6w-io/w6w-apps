import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  httpAuthParams,
  nameParam,
  pagesParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /v1/pdf/edit/delete-pages` — remove pages from a PDF.
 *
 * **1-based `pages`, unlike almost every other endpoint in this app.** The
 * endpoint's own Markdown page opens with an explicit warning: "The `pages`
 * parameter is 1-based, meaning the first page is `1` and not `0`." Every
 * other action here (`pdf-to-text`, `pdf-split`, `pdf-rotate`, `pdf-find`,
 * `barcode-read`, …) uses the 0-based convention. `pages` is also required
 * here — omitting it, or sending it blank, returns HTTP 400.
 */
interface Input {
  url: string;
  pages: string;
  name?: string;
  async?: boolean;
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

const pdfDeletePages: ActionDefinition<Input, Output> = {
  key: "pdf-delete-pages",
  type: "perform",
  title: "Delete PDF Pages",
  description: "Remove one or more pages from a PDF. Page numbers here are 1-based (page 1 is " +
    "the first page) — this is the one endpoint in this app that is not 0-based.",
  idempotent: false,
  params: [
    urlParam(),
    { ...pagesParam(true), required: true },
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "url", type: "string", label: "Output PDF URL" },
    { key: "pageCount", type: "number", label: "Remaining page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/edit/delete-pages", compact({ ...input }));
  },
};

export default pdfDeletePages;
