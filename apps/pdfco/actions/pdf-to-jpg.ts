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

/**
 * `POST /v1/pdf/convert/to/jpg` — rasterize pages as JPG images (one output
 * file per page unless a `pages` range narrows it). PNG/WEBP/TIFF are
 * near-identical sibling endpoints (`/pdf/convert/to/png|webp|tiff`) — not
 * implemented here to keep the surface bounded; JPG is the most commonly
 * requested raster format.
 *
 * `inline` is deliberately not exposed: the vendor's own worked example sets
 * `"inline": true` and still gets back `urls` (S3 links), not embedded image
 * bytes — unlike `pdf-to-text`/`pdf-to-csv`, where `inline: true` visibly
 * changes the response shape to a `body` field. Exposing a toggle that the
 * vendor's own example shows doing nothing would be misleading.
 */
interface Input {
  url: string;
  rect?: string;
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
  urls?: string[];
  pageCount?: number;
  jobId?: string;
}

const pdfToJpg: ActionDefinition<Input, Output> = {
  key: "pdf-to-jpg",
  type: "read",
  title: "Convert PDF to JPG",
  description: "Rasterize PDF pages as JPG images. Returns one image URL per rendered page.",
  params: [
    urlParam(),
    pagesParam(false),
    {
      key: "rect",
      label: "Render rectangle",
      type: "string",
      advanced: true,
      hint: '"{x} {y} {width} {height}" to render a specific region only.',
    },
    passwordParam(),
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
    ...httpAuthParams(),
  ],
  output: [
    { key: "urls", type: "array", label: "Output image URLs (one per page)" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/convert/to/jpg", compact({ ...input }));
  },
};

export default pdfToJpg;
