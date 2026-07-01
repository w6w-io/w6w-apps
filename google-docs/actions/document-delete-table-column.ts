import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  rowIndex: number;
  columnIndex: number;
  index: number;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/** `deleteTableColumn` — delete the column containing the given cell. */
const documentDeleteTableColumn: ActionDefinition<Input> = {
  key: "document-delete-table-column",
  type: "perform",
  resource: "document",
  title: "Delete Table Column",
  description: "Delete the column containing the given cell.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "index", label: "Table Start Index", type: "number", required: true },
    { key: "rowIndex", label: "Row Index", type: "number", required: true },
    { key: "columnIndex", label: "Column Index", type: "number", required: true },
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
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const segmentId = input.insertSegment && input.insertSegment !== "body"
      ? (input.segmentId ?? "")
      : "";
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [{
          deleteTableColumn: {
            tableCellLocation: {
              rowIndex: input.rowIndex,
              columnIndex: input.columnIndex,
              tableStartLocation: { segmentId, index: input.index },
            },
          },
        }],
      },
    });
  },
};

export default documentDeleteTableColumn;
