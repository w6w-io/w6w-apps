import type { ActionDefinition } from "@w6w/types";
import { PdfMonkeyClient } from "../lib/client.ts";

interface Input {
  documentId: string;
}

interface Output {
  documentId: string;
  deleted: true;
}

/**
 * `DELETE /api/v1/documents/{id}` — permanently delete a document and its
 * generated file. Answers `204 No Content`. Idempotent in the sense the
 * runtime cares about: the end state after one call and after five is the
 * same document gone (a repeat call surfaces a 404, worth seeing rather than
 * swallowing).
 */
const deleteDocument: ActionDefinition<Input, Output> = {
  key: "delete-document",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Permanently delete a document and its generated file.",
  idempotent: true,
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
    { key: "documentId", type: "string", label: "Document ID deleted" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new PdfMonkeyClient(ctx);
    await client.request<void>(`/documents/${input.documentId}`, { method: "DELETE" });
    return { documentId: input.documentId, deleted: true };
  },
};

export default deleteDocument;
