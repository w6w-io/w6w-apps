import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { asyncParam, expirationParam, nameParam, profilesParam, urlParam } from "../lib/params.ts";

/**
 * `POST /v1/pdf/security/add` — encrypt a PDF and set open/permission
 * passwords. Field casing (`ownerPassword`, `userPassword`,
 * `encryptionAlgorithm`, `allowPrintDocument`, …) verified against this
 * endpoint's own Markdown table. Per the vendor's own warning: changing any
 * `allow*` restriction requires `ownerPassword` to be set — `userPassword`
 * alone cannot modify permissions.
 */
interface Input {
  url: string;
  ownerPassword?: string;
  userPassword?: string;
  encryptionAlgorithm?: string;
  allowPrintDocument?: boolean;
  allowFillForms?: boolean;
  allowModifyDocument?: boolean;
  allowContentExtraction?: boolean;
  allowModifyAnnotations?: boolean;
  allowAssemblyDocument?: boolean;
  allowAccessibilitySupport?: boolean;
  printQuality?: string;
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

const pdfAddPassword: ActionDefinition<Input, Output> = {
  key: "pdf-add-password",
  type: "perform",
  title: "Add Password / Restrictions to PDF",
  description: "Encrypt a PDF with an owner and/or user password, and optionally restrict " +
    "printing, editing, form-filling, content extraction, or assembly.",
  idempotent: false,
  params: [
    urlParam(),
    {
      key: "ownerPassword",
      label: "Owner password",
      type: "secret",
      hint: "Required to set or remove any of the restrictions below later. Also used for " +
        "encryption if no user password is set.",
    },
    {
      key: "userPassword",
      label: "User (open) password",
      type: "secret",
      hint: "Required to open/view or print the document, if set.",
    },
    {
      key: "encryptionAlgorithm",
      label: "Encryption algorithm",
      type: "select",
      default: "AES_128bit",
      advanced: true,
      options: [
        { value: "RC4_40bit", label: "RC4 40-bit (legacy)" },
        { value: "RC4_128bit", label: "RC4 128-bit (legacy)" },
        { value: "AES_128bit", label: "AES 128-bit" },
        { value: "AES_256bit", label: "AES 256-bit" },
      ],
    },
    {
      key: "allowPrintDocument",
      label: "Allow printing",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowFillForms",
      label: "Allow filling form fields",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowModifyDocument",
      label: "Allow modifying the document",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowContentExtraction",
      label: "Allow copying content",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowModifyAnnotations",
      label: "Allow modifying annotations/forms",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowAssemblyDocument",
      label: "Allow assembling the document",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowAccessibilitySupport",
      label: "Allow accessibility content extraction",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "printQuality",
      label: "Allowed print quality",
      type: "select",
      advanced: true,
      default: "HighResolution",
      options: [
        { value: "LowResolution", label: "Low resolution" },
        { value: "HighResolution", label: "High resolution" },
      ],
    },
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
    return await client.post<Output>("/v1/pdf/security/add", compact({ ...input }));
  },
};

export default pdfAddPassword;
