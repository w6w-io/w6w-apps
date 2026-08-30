import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  entryId: string;
  templateId: string;
}

/**
 * GET /forms/{formId}/entries/{entryId}/documents/{templateId} — a generated entry document (e.g.
 * a PDF built from a document template), returned as JSON with the file content base64-encoded in
 * `Content` (the API's `produces: application/json`, not a raw byte stream). Requires `Entry:Read`.
 */
const entryDocumentGet: ActionDefinition<Input> = {
  key: "entry-document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a document generated for an entry (e.g. a filled-in PDF template).",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "Get IDs from a webhook payload, an import result, or another system's own record.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The document template's ID, from the entry's `Document1`/`Document2`/… fields.",
    },
  ],
  output: [
    { key: "Id", type: "string", label: "File ID" },
    { key: "Name", type: "string", label: "File name" },
    { key: "ContentType", type: "string", label: "MIME type" },
    { key: "Size", type: "number", label: "Size in bytes" },
    { key: "File", type: "string", label: "Direct download URL" },
    { key: "Content", type: "string", label: "Base64-encoded file content" },
  ],

  async execute(input, ctx) {
    return await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries/${
        encodeURIComponent(input.entryId)
      }/documents/${encodeURIComponent(input.templateId)}`,
    );
  },
};

export default entryDocumentGet;
