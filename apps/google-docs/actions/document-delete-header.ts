import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  headerId: string;
}

/** `deleteHeader` — remove a document header by ID. */
const documentDeleteHeader: ActionDefinition<Input> = {
  key: "document-delete-header",
  type: "perform",
  resource: "document",
  title: "Delete Header",
  description: "Delete a header by ID (find it in `Get Document → simple = false → headers`).",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "headerId", label: "Header ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ deleteHeader: { headerId: input.headerId } }] },
    });
  },
};

export default documentDeleteHeader;
