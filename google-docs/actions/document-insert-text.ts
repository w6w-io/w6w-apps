import type { ActionDefinition } from "@w6w/types";
import {
  buildLocation,
  extractDocumentId,
  GoogleDocsClient,
  type SegmentLocation,
} from "../lib/client.ts";

interface Input extends SegmentLocation {
  documentURL: string;
  text: string;
}

/**
 * `insertText` — insert a string at a location or at end of a segment.
 * Mirrors n8n's `object: text, action: insert` branch.
 */
const documentInsertText: ActionDefinition<Input> = {
  key: "document-insert-text",
  type: "perform",
  resource: "document",
  title: "Insert Text",
  description: "Insert text into a document at a specific index or at the end of a segment.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "text", label: "Text", type: "text", required: true },
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
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      hint: "Required for header/footer/footnote segments (see the Get action's raw response).",
    },
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
    { key: "index", label: "Index", type: "number", hint: "Zero-based index within the segment." },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const request = {
      insertText: {
        text: input.text,
        ...buildLocation(input),
      },
    };
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [request] },
    });
  },
};

export default documentInsertText;
