import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
  locationChoice?: "endOfSegmentLocation" | "location";
  index?: number;
}

/**
 * `createHeader` — create a document-level header. The n8n node always emits
 * `type: DEFAULT` and only supports the `sectionBreakLocation` variant.
 */
const documentCreateHeader: ActionDefinition<Input> = {
  key: "document-create-header",
  type: "perform",
  resource: "document",
  title: "Create Header",
  description: "Create a header on the document.",
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
      createHeader: {
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

export default documentCreateHeader;
