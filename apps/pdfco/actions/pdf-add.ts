import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asOptionalJson,
  asyncParam,
  expirationParam,
  httpAuthParams,
  inlineParam,
  nameParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /v1/pdf/edit/add` — add text/images/PDF overlays and fill form
 * fields. Only `url` is required: openapi.json's `required: ["url",
 * "annotationsString"]` is wrong — the endpoint's own Markdown table marks
 * `annotationsString` (and `annotations`/`images`/`fields`) *No*, and the
 * vendor's worked examples elsewhere in the docs call related endpoints with
 * none of them set. `annotations`/`images`/`fields` are exposed here as
 * `json` params carrying the vendor's own documented array-of-objects shape
 * verbatim (see PDF.co's PDF Add reference for each object's fields), rather
 * than the pipe-delimited `annotationsString`/`imagesString`/`fieldsString`
 * mini-language, which is harder to get right by hand.
 */
interface Input {
  url: string;
  annotations?: unknown;
  images?: unknown;
  fields?: unknown;
  inline?: boolean;
  password?: string;
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

const pdfAdd: ActionDefinition<Input, Output> = {
  key: "pdf-add",
  type: "perform",
  title: "Add Text, Images & Fill Form Fields",
  description: "Overlay text, images, or other PDFs onto a PDF, and/or fill values into an " +
    "existing PDF form's fields.",
  idempotent: false,
  params: [
    urlParam(),
    {
      key: "annotations",
      label: "Text/annotation objects",
      type: "json",
      advanced: true,
      hint: 'Array of {text, x, y, pages?, size?, color?, fontName?, ...}. Use "Get PDF Form ' +
        "Fields\" or PDF.co's PDF Edit Add Helper to find coordinates.",
    },
    {
      key: "images",
      label: "Image/PDF overlay objects",
      type: "json",
      advanced: true,
      hint: "Array of {url, x, y, width?, height?, pages?, keepAspectRatio?}.",
    },
    {
      key: "fields",
      label: "Form field values",
      type: "json",
      advanced: true,
      hint: 'Array of {fieldName, text, pages?, size?, fontName?}. Use "Get PDF Form Fields" to ' +
        "list field names first.",
    },
    inlineParam(false),
    passwordParam(),
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
    const body = {
      ...input,
      annotations: asOptionalJson(input.annotations, "annotations"),
      images: asOptionalJson(input.images, "images"),
      fields: asOptionalJson(input.fields, "fields"),
    };
    return await client.post<Output>("/v1/pdf/edit/add", compact(body));
  },
};

export default pdfAdd;
