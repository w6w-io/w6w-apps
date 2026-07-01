import type { ActionDefinition } from "@w6w/types";
import { MistralClient } from "../lib/client.ts";

interface Input {
  model?: string;
  documentType?: "document_url" | "image_url";
  /** Either a URL, or a base64 data URL (`data:application/pdf;base64,...`). */
  url: string;
  /** Optional display name when `documentType` is `document_url`. */
  documentName?: string;
}

interface Page {
  index: number;
  markdown: string;
  images: unknown[];
}

interface OcrResponse {
  pages: Page[];
  [key: string]: unknown;
}

/**
 * Mirrors n8n's Document → Extract Text (non-batch, URL path). Callers that
 * previously used the "binary" input path in n8n should base64-encode the file
 * into a `data:` URL and pass it as `url` — the Mistral API accepts either.
 */
const extractText: ActionDefinition<Input> = {
  key: "extract-text",
  type: "perform",
  resource: "document",
  title: "Extract Text (OCR)",
  description: "Extract text from a document or image using Mistral OCR.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "select",
      default: "mistral-ocr-latest",
      options: [{ value: "mistral-ocr-latest", label: "mistral-ocr-latest" }],
      required: true,
    },
    {
      key: "documentType",
      label: "Document Type",
      type: "select",
      default: "document_url",
      required: true,
      options: [
        { value: "document_url", label: "Document (PDF)" },
        { value: "image_url", label: "Image" },
      ],
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Public URL, or a base64 data URL (`data:<mime>;base64,...`).",
    },
    {
      key: "documentName",
      label: "Document Name",
      type: "string",
      hint: "Only used when Document Type is `document_url`.",
    },
  ],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "extractedText", type: "string", label: "Extracted text (all pages joined)" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new MistralClient(ctx);
    const documentType = input.documentType ?? "document_url";
    const model = input.model ?? "mistral-ocr-latest";

    const document: Record<string, unknown> = {
      type: documentType,
      [documentType]: input.url,
    };
    if (documentType === "document_url" && input.documentName) {
      document.document_name = input.documentName;
    }

    const response = await client.request<OcrResponse>("/v1/ocr", {
      method: "POST",
      body: { model, document },
    });

    const pages = response.pages ?? [];
    return {
      ...response,
      extractedText: pages.map((p) => p.markdown).join("\n\n"),
      pageCount: pages.length,
    };
  },
};

export default extractText;
