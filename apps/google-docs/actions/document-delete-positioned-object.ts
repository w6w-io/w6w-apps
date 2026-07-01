import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  objectId: string;
}

/**
 * `deletePositionedObject` — delete a positioned object (image/shape anchored
 * to a paragraph) by ID.
 */
const documentDeletePositionedObject: ActionDefinition<Input> = {
  key: "document-delete-positioned-object",
  type: "perform",
  resource: "document",
  title: "Delete Positioned Object",
  description: "Delete a positioned object by ID.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "objectId", label: "Object ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ deletePositionedObject: { objectId: input.objectId } }] },
    });
  },
};

export default documentDeletePositionedObject;
