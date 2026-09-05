import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentId: string;
}

interface Document {
  id?: string;
  app_id?: string;
  checksum?: string;
  created_at?: string;
  document_template_id?: string;
  download_url?: string | null;
  failure_cause?: string | null;
  filename?: string | null;
  generation_logs?: Array<{ type: string; message: string; timestamp: string }>;
  meta?: Record<string, unknown> | null;
  output_type?: string;
  payload?: Record<string, unknown> | null;
  preview_url?: string;
  public_share_link?: string | null;
  status?: string;
  updated_at?: string;
}

interface Response {
  document: Document;
}

/**
 * `GET /api/v1/documents/{id}` — the full `Document`, including `payload`
 * and `generation_logs`. PDFMonkey's own docs recommend `get-document-card`
 * instead unless a workflow actually needs those two fields back.
 */
const getDocument: ActionDefinition<Input, Document> = {
  key: "get-document",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Fetch the full document, including payload and generation logs.",
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "From a Create Document result, or the List Documents action.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "download_url", type: "string", label: "Download URL" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "payload", type: "object", label: "Payload used for generation" },
    { key: "generation_logs", type: "array", label: "Generation logs" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>(`/documents/${input.documentId}`);
    return res.document;
  },
};

export default getDocument;
