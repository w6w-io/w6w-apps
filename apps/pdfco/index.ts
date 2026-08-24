/**
 * PDF.co — PDF/document generation, conversion, extraction and manipulation,
 * over the PDF.co REST API v1/v2 (`api.pdf.co`).
 *
 * Every path, field name/casing, and response shape in this app was verified
 * on 2026-08-24 against PDF.co's own OpenAPI 3.0 document
 * (`developer.pdf.co/openapi.json`, 553,062 bytes, `info.version` `1.0`, 67
 * paths), its per-endpoint Markdown reference (`developer.pdf.co/llms-full.txt`,
 * 3.4 MB), and live probes against `api.pdf.co` and the two candidate status
 * hosts. Nothing here came from a third-party integration directory.
 *
 * The findings that shaped this app, documented in full where they matter:
 *
 *  1. **openapi.json lower-cases almost every field name**, and PDF.co's API
 *     is genuinely case-sensitive (`lib/client.ts`). Sending the generated
 *     casing is not an error — the field is silently dropped and the
 *     documented default applies instead.
 *  2. **openapi.json's `required` arrays are sometimes fiction** — e.g.
 *     `pdf/edit/add` claims `annotationsString` is required, `pdf/convert
 *     /from/html` claims `templateid` is — both are `*No*` in the vendor's
 *     own tables, whose worked examples omit them entirely (`lib/client.ts`,
 *     `actions/pdf-add.ts`, `actions/pdf-from-html.ts`).
 *  3. **A documented "required" field the vendor's own example never
 *     sends** — `barcode/read/from/url`'s table copy-pastes the *generate*
 *     endpoint's required `type` field; the real worked example calls it
 *     with only `url`/`types`/`async` (`actions/barcode-read.ts`).
 *  4. **Page indexing is not uniform**: most endpoints are 0-based, but
 *     `pdf/edit/delete-pages` is explicitly documented 1-based
 *     (`actions/pdf-delete-pages.ts`).
 *  5. **`file/hash` is titled "MD5 Hash" and returns SHA-256** — its own
 *     worked example is a 64-hex-character digest (`actions/file-hash.ts`).
 *  6. **Neither candidate status host is real.** `status.pdf.co` and
 *     `pdf-co.statuspage.io` are both unclaimed placeholders on two
 *     different providers (`health/service.ts`).
 *
 * Every input is a URL, never raw file bytes: the OpenAPI `file` schema
 * ("path to a local file") only serves the vendor's own SDKs reading local
 * disk, which a sandboxed Action cannot do. `file-upload-from-url` is this
 * app's one file-hosting primitive (see its own doc comment for why the raw
 * multipart/base64 upload variants are skipped).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import pdfToText from "./actions/pdf-to-text.ts";
import pdfToJson from "./actions/pdf-to-json.ts";
import pdfToCsv from "./actions/pdf-to-csv.ts";
import pdfToHtml from "./actions/pdf-to-html.ts";
import pdfToJpg from "./actions/pdf-to-jpg.ts";

import pdfFromHtml from "./actions/pdf-from-html.ts";
import pdfFromUrl from "./actions/pdf-from-url.ts";
import pdfFromImage from "./actions/pdf-from-image.ts";

import pdfMerge from "./actions/pdf-merge.ts";
import pdfSplit from "./actions/pdf-split.ts";
import pdfInfo from "./actions/pdf-info.ts";
import pdfFormsInfo from "./actions/pdf-forms-info.ts";
import pdfFind from "./actions/pdf-find.ts";

import pdfAdd from "./actions/pdf-add.ts";
import pdfDeletePages from "./actions/pdf-delete-pages.ts";
import pdfRotate from "./actions/pdf-rotate.ts";

import pdfAddPassword from "./actions/pdf-add-password.ts";
import pdfRemovePassword from "./actions/pdf-remove-password.ts";

import barcodeGenerate from "./actions/barcode-generate.ts";
import barcodeRead from "./actions/barcode-read.ts";

import fileUploadFromUrl from "./actions/file-upload-from-url.ts";
import fileHash from "./actions/file-hash.ts";
import accountBalanceGet from "./actions/account-balance-get.ts";
import jobCheck from "./actions/job-check.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Convert PDF to other formats
    pdfToText,
    pdfToJson,
    pdfToCsv,
    pdfToHtml,
    pdfToJpg,
    // Convert other formats to PDF
    pdfFromHtml,
    pdfFromUrl,
    pdfFromImage,
    // Merge, split, inspect, search
    pdfMerge,
    pdfSplit,
    pdfInfo,
    pdfFormsInfo,
    pdfFind,
    // Edit
    pdfAdd,
    pdfDeletePages,
    pdfRotate,
    // Security
    pdfAddPassword,
    pdfRemovePassword,
    // Barcodes
    barcodeGenerate,
    barcodeRead,
    // Files, account, jobs
    fileUploadFromUrl,
    fileHash,
    accountBalanceGet,
    jobCheck,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
