import type { ActionDefinition } from "@w6w/types";
import {
  buildLocation,
  extractDocumentId,
  GoogleDocsClient,
  type SegmentLocation,
} from "../lib/client.ts";

interface Input extends SegmentLocation {
  documentURL: string;
}

/**
 * `insertPageBreak` — insert a page break at a location. Matches n8n's
 * `object: pageBreak, action: insert` branch.
 */
const documentInsertPageBreak: ActionDefinition<Input> = {
  key: "document-insert-page-break",
  type: "perform",
  resource: "document",
  title: "Insert Page Break",
  description: "Insert a page break at a location.",
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
    {
      key: "locationChoice",
      label: "Where",
      type: "select",
      default: "endOfSegmentLocation",
      options: [
        { value: "endOfSegmentLocation", label: "At end of segment" },
        { value: "location", label: "At index" },
      ],
    },
    { key: "index", label: "Index", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const request = { insertPageBreak: buildLocation(input) };
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [request] },
    });
  },
};

export default documentInsertPageBreak;
