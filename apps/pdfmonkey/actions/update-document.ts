import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentId: string;
  documentTemplateId?: string;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  status?: "" | "draft" | "pending";
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
 * `PUT /api/v1/documents/{id}` — change a document's payload/meta/template,
 * or trigger generation on a `draft` by setting `status: "pending"`.
 * Marked idempotent: re-sending the same fields converges to the same state.
 */
const updateDocument: ActionDefinition<Input, Document> = {
  key: "update-document",
  type: "perform",
  resource: "document",
  title: "Update Document",
  description: "Update a document's payload/meta/template, or trigger generation.",
  idempotent: true,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "From a Create Document result, or the List Documents action.",
    },
    { key: "documentTemplateId", label: "New template ID", type: "string" },
    {
      key: "payload",
      label: "Payload",
      type: "json",
      hint: "Replaces the dynamic data used to fill the template.",
    },
    {
      key: "meta",
      label: "Meta",
      type: "json",
      hint: "Replaces the document's metadata.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "pending", label: "Pending (trigger generation)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "download_url", type: "string", label: "Download URL" },
    { key: "filename", type: "string", label: "Filename" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>(`/documents/${input.documentId}`, {
      method: "PUT",
      body: {
        document: {
          document_template_id: input.documentTemplateId || undefined,
          payload: input.payload,
          meta: input.meta,
          status: input.status || undefined,
        },
      },
    });
    return res.document;
  },
};

export default updateDocument;
