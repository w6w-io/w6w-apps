import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
  index?: number;
}

/**
 * `createFooter` — create a document-level footer. See `createHeader` for
 * shape rationale.
 */
const documentCreateFooter: ActionDefinition<Input> = {
  key: "document-create-footer",
  type: "perform",
  resource: "document",
  title: "Create Footer",
  description: "Create a footer on the document.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    {
      key: "insertSegment",
      label: "Segment",
      type: "select",
      default: "body",
      options: [
        { value: "body", label: "Body" },
        { value: "header", label: "Header" },
        { value: "footer", label: "Footer" },
      ],
    },
    { key: "segmentId", label: "Segment ID", type: "string" },
    { key: "index", label: "Index", type: "number", default: 0 },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const segmentId = input.insertSegment && input.insertSegment !== "body"
      ? (input.segmentId ?? "")
      : "";
    const request = {
      createFooter: {
        type: "DEFAULT",
        sectionBreakLocation: {
          segmentId,
          index: input.index ?? 0,
        },
      },
    };
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [request] },
    });
  },
};

export default documentCreateFooter;
