import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentTemplateId: string;
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
 * `POST /api/v1/documents` — create a document from a template.
 *
 * Generation is **asynchronous by default**: leaving `status` unset creates a
 * `draft` that never renders until updated. Set `status: "pending"` to queue
 * generation immediately, then poll `get-document-card` (or use a webhook)
 * until `status` reaches `"success"` and `download_url` is populated.
 * See `create-document-sync` for a single-request alternative.
 */
const createDocument: ActionDefinition<Input, Document> = {
  key: "create-document",
  type: "perform",
  resource: "document",
  title: "Create Document",
  description: "Create a document from a template, optionally queuing generation.",
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
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Draft (default — do not generate yet)" },
        { value: "pending", label: "Pending (queue generation now)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "download_url", type: "string", label: "Download URL (null until success)" },
    { key: "filename", type: "string", label: "Filename (null until success)" },
    { key: "preview_url", type: "string", label: "Preview URL" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    const res = await client.request<Response>("/documents", {
      method: "POST",
      body: {
        document: {
          document_template_id: input.documentTemplateId,
          payload: input.payload,
          meta: input.meta,
          status: input.status || undefined,
        },
      },
    });
    return res.document;
  },
};

export default createDocument;
