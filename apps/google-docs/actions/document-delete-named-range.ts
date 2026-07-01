import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  /** Which discriminator to use — `namedRangeId` (single ID) or `name` (all matches). */
  reference: "namedRangeId" | "name";
  value: string;
}

/**
 * `deleteNamedRange` — delete by named-range ID or by name (deletes every
 * range with that name). Matches n8n's `namedRangeReference` split.
 */
const documentDeleteNamedRange: ActionDefinition<Input> = {
  key: "document-delete-named-range",
  type: "perform",
  resource: "document",
  title: "Delete Named Range",
  description: "Delete a named range by its ID, or every range with a given name.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    {
      key: "reference",
      label: "Delete by",
      type: "select",
      required: true,
      default: "namedRangeId",
      options: [
        { value: "namedRangeId", label: "ID" },
        { value: "name", label: "Name" },
      ],
    },
    { key: "value", label: "Value", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [{
          deleteNamedRange: { [input.reference]: input.value },
        }],
      },
    });
  },
};

export default documentDeleteNamedRange;
