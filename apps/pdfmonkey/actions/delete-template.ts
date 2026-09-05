import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

interface Output {
  templateId: string;
  deleted: true;
}

/**
 * `DELETE /api/v1/document_templates/{id}` — permanently delete a template.
 * Irreversible; every document linked to it loses its template reference.
 * Answers `204 No Content`.
 */
const deleteTemplate: ActionDefinition<Input, Output> = {
  key: "delete-template",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Permanently delete a template. Linked documents lose their template reference.",
  idempotent: true,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the PDFMonkey dashboard, or the List Templates action.",
    },
  ],
  output: [
    { key: "templateId", type: "string", label: "Template ID deleted" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    await client.request<void>(`/document_templates/${input.templateId}`, { method: "DELETE" });
    return { templateId: input.templateId, deleted: true };
  },
};

export default deleteTemplate;
