import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentTemplateId: string;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
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
 * `POST /api/v1/documents/sync` — create a document and wait for generation
 * to finish in the same request.
 *
 * A convenience wrapper: PDFMonkey polls server-side so the caller gets a
 * finished (or failed) result in one round trip. It **requires** `status:
 * "pending"` to actually generate — this action always sends it, since a
 * sync call that leaves the document a `draft` would only wait out the
 * timeout for nothing. The response is nested under `document_card` and is
 * a lighter `DocumentCard`, not the full `Document` — it has no `payload` or
 * `generation_logs`.
 *
 * The vendor caps this endpoint at a 6-minute timeout. For production
 * pipelines or batch generation, prefer `create-document` plus a webhook or
 * `get-document-card` polling instead.
 */
const createDocumentSync: ActionDefinition<Input, DocumentCard> = {
  key: "create-document-sync",
  type: "perform",
  resource: "document",
  title: "Create Document (Synchronous)",
  description: "Create a document and wait for generation to complete (up to 6 minutes).",
  idempotent: false,
  params: [
    {
      key: "documentTemplateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the PDFMonkey dashboard, or the List Templates action.",
    },
    {
      key: "payload",
      label: "Payload",
      type: "json",
      hint: "Dynamic data used to fill the template. Must be a JSON object, not an array.",
    },
    {
      key: "meta",
      label: "Meta",
      type: "json",
      hint:
        'Arbitrary metadata (max 200 KB). Supports the special "_filename" key to control the ' +
        "generated file's name.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "download_url", type: "string", label: "Download URL" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "preview_url", type: "string", label: "Preview URL" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>("/documents/sync", {
      method: "POST",
      body: {
        document: {
          document_template_id: input.documentTemplateId,
          payload: input.payload,
          meta: input.meta,
          status: "pending",
        },
      },
    });
    return res.document_card;
  },
};

export default createDocumentSync;
