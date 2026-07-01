import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  footerId: string;
}

/** `deleteFooter` — remove a document footer by ID. */
const documentDeleteFooter: ActionDefinition<Input> = {
  key: "document-delete-footer",
  type: "perform",
  resource: "document",
  title: "Delete Footer",
  description: "Delete a footer by ID (find it in `Get Document → simple = false → footers`).",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "footerId", label: "Footer ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ deleteFooter: { footerId: input.footerId } }] },
    });
  },
};

export default documentDeleteFooter;
