import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  inlineParam,
  nameParam,
  profilesParam,
} from "../lib/params.ts";

/** `POST /v1/barcode/generate` — render a barcode image from a value. */
interface Input {
  type: string;
  value: string;
  decorationImage?: string;
  inline?: boolean;
  async?: boolean;
  name?: string;
  expiration?: number;
  profiles?: unknown;
}

interface Output {
  url?: string;
  jobId?: string;
}

const BARCODE_TYPES = [
  "QRCode",
  "Aztec",
  "DataMatrix",
  "MaxiCode",
  "PDF417",
  "Code128",
  "Code93",
  "Code39",
  "Code39Extended",
  "Code39Mod43",
  "Code39Mod43Extended",
  "Code16K",
  "Codabar",
  "CodablockF",
  "GS1",
  "EAN2",
  "EAN5",
  "EAN8",
  "EAN13",
  "GTIN8",
  "GTIN12",
  "GTIN13",
  "GTIN14",
  "UPCA",
  "UPCE",
  "ITF14",
  "Interleaved2of5",
  "CircularI2of5",
  "MSI",
  "Pharmacode",
  "PostNet",
  "PZN",
  "RoyalMail",
  "RoyalMailKIX",
  "AustralianPostCode",
  "IntelligentMail",
  "Trioptic",
  "UPU",
  "MICR",
];

const barcodeGenerate: ActionDefinition<Input, Output> = {
  key: "barcode-generate",
  type: "perform",
  title: "Generate Barcode",
  description: "Render a barcode (QR code, PDF417, Code128, EAN13, …) image encoding a value.",
  idempotent: false,
  params: [
    {
      key: "value",
      label: "Value to encode",
      type: "string",
      required: true,
    },
    {
      key: "type",
      label: "Barcode type",
      type: "select",
      required: true,
      default: "QRCode",
      options: BARCODE_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      key: "decorationImage",
      label: "Logo image URL",
      type: "string",
      advanced: true,
      hint: "URL of an image to embed as a logo inside a QR code. Upload it via a file action " +
        "first if it isn't already hosted.",
    },
    {
      ...inlineParam(false),
      hint: "When true, the result is returned inline in the response instead of as a URL " +
        "(PDF.co's own worked example for this endpoint only shows inline: false).",
    },
    asyncParam(),
    nameParam("barcode.png"),
    expirationParam(),
    profilesParam(),
  ],
  output: [
    { key: "url", type: "string", label: "Output image URL" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/barcode/generate", compact({ ...input }));
  },
};

export default barcodeGenerate;
