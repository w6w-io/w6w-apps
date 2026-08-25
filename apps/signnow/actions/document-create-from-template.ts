import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  documentName?: string;
}

/**
 * `POST /template/{template_id}/copy` — creates a new, independent document
 * from a template. If `documentName` is omitted, SignNow names the copy after
 * the template.
 */
const documentCreateFromTemplate: ActionDefinition<Input> = {
  key: "document-create-from-template",
  type: "perform",
  resource: "document",
  title: "Create Document from Template",
  description: "Create a new document by copying a template.",
  idempotent: false,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
    },
    { key: "documentName", label: "Document Name", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "New document ID" },
    { key: "document_name", type: "string", label: "Document name" },
  ],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(
      `/template/${encodeURIComponent(input.templateId)}/copy`,
      { method: "POST", body: compact({ document_name: input.documentName }) },
    );
  },
};

export default documentCreateFromTemplate;
