import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  nameParam,
  pagesParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/edit/rotate` — rotate selected pages. 0-based `pages`, like most of this app. */
interface Input {
  url: string;
  pages?: string;
  angle?: number;
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

const pdfRotate: ActionDefinition<Input, Output> = {
  key: "pdf-rotate",
  type: "perform",
  title: "Rotate PDF Pages",
  description: "Rotate selected pages of a PDF by a fixed angle.",
  idempotent: false,
  params: [
    urlParam(),
    {
      key: "angle",
      label: "Rotation angle",
      type: "select",
      default: 0,
      options: [
        { value: 0, label: "0°" },
        { value: 90, label: "90°" },
        { value: 180, label: "180°" },
        { value: 270, label: "270°" },
      ],
    },
    pagesParam(false),
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
    return await client.post<Output>("/v1/pdf/edit/rotate", compact({ ...input }));
  },
};

export default pdfRotate;
