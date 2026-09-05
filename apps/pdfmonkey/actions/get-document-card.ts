import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentId: string;
}

interface DocumentCard {
  id?: string;
  app_id?: string;
  created_at?: string;
  document_template_id?: string;
  document_template_identifier?: string;
  download_url?: string | null;
  failure_cause?: string | null;
  filename?: string | null;
  meta?: Record<string, unknown> | null;
  output_type?: string;
  preview_url?: string;
  public_share_link?: string | null;
  status?: string;
  updated_at?: string;
}

interface Response {
  document_card: DocumentCard;
}

/**
 * `GET /api/v1/document_cards/{id}` — the recommended way to check
 * generation status and retrieve the `download_url`. Lighter than
 * `get-document`: no `payload` or `generation_logs`, plus
 * `document_template_identifier` for display.
 */
const getDocumentCard: ActionDefinition<Input, DocumentCard> = {
  key: "get-document-card",
  type: "read",
  resource: "document",
  title: "Get Document Card",
  description: "Fetch a document's status and download URL (lightweight — no payload).",
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
    { key: "document_template_identifier", type: "string", label: "Template name" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>(`/document_cards/${input.documentId}`);
    return res.document_card;
  },
};

export default getDocumentCard;
