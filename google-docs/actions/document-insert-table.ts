import type { ActionDefinition } from "@w6w/types";
import {
  buildLocation,
  extractDocumentId,
  GoogleDocsClient,
  type SegmentLocation,
} from "../lib/client.ts";

interface Input extends SegmentLocation {
  documentURL: string;
  rows: number;
  columns: number;
}

/**
 * `insertTable` — insert an empty table of `rows x columns`. Matches n8n's
 * `object: table, action: insert` branch.
 */
const documentInsertTable: ActionDefinition<Input> = {
  key: "document-insert-table",
  type: "perform",
  resource: "document",
  title: "Insert Table",
  description: "Insert an empty rows × columns table at a location.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    {
      key: "rows",
      label: "Rows",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
    {
      key: "columns",
      label: "Columns",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
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
    const request = {
      insertTable: {
        rows: input.rows,
        columns: input.columns,
        ...buildLocation(input),
      },
    };
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [request] },
    });
  },
};

export default documentInsertTable;
