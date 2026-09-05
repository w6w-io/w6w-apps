import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  page?: number;
  documentTemplateId?: string;
  status?: "" | "draft" | "pending" | "generating" | "success" | "failure";
  workspaceId?: string;
  updatedSince?: string;
  search?: string;
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

interface Meta {
  current_page?: number;
  next_page?: number | null;
  prev_page?: number | null;
  total_pages?: number;
}

interface Output {
  document_cards: DocumentCard[];
  meta: Meta;
}

/**
 * `GET /api/v1/document_cards` — a paginated list of `DocumentCard`s, 24 per
 * page. Every filter is optional; `documentTemplateId` accepts a
 * comma-separated list of UUIDs per the vendor's docs. `search` matches by
 * exact document ID when the value is a UUID, otherwise by partial filename.
 */
const listDocuments: ActionDefinition<Input, Output> = {
  key: "list-documents",
  type: "read",
  resource: "document",
  title: "List Documents",
  description: "List generated documents, optionally filtered by template, status, or workspace.",
  params: [
    {
      key: "page",
      label: "Page number",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "documentTemplateId",
      label: "Template ID(s)",
      type: "string",
      hint: "One UUID, or a comma-separated list to match several templates.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "generating", label: "Generating" },
        { value: "success", label: "Success" },
        { value: "failure", label: "Failure" },
      ],
    },
    { key: "workspaceId", label: "Workspace ID", type: "string" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "string",
      hint: "A Unix timestamp (e.g. 1640995200) or an ISO 8601 string.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "A document ID (exact match) or part of a filename (partial match).",
    },
  ],
  output: [
    { key: "document_cards", type: "array", label: "Document cards" },
    { key: "meta", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    return client.request<Output>("/document_cards", {
      query: {
        "page[number]": input.page,
        "q[document_template_id]": input.documentTemplateId,
        "q[status]": input.status || undefined,
        "q[workspace_id]": input.workspaceId,
        "q[updated_since]": input.updatedSince,
        "q[search]": input.search,
      },
    });
  },
};

export default listDocuments;
