import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  rowIndex: number;
  columnIndex: number;
  /** Table start location within the segment. */
  index: number;
  /** `true` = insertBelow (default), `false` = insertAbove. */
  insertPosition?: boolean;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/**
 * `insertTableRow` — insert a row above or below a target cell. Google expects
 * `insertBelow: boolean` at the top level and a `tableCellLocation`.
 */
const documentInsertTableRow: ActionDefinition<Input> = {
  key: "document-insert-table-row",
  type: "perform",
  resource: "document",
  title: "Insert Table Row",
  description: "Insert a table row above or below an existing cell.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "index", label: "Table Start Index", type: "number", required: true },
    { key: "rowIndex", label: "Row Index", type: "number", required: true },
    { key: "columnIndex", label: "Column Index", type: "number", required: true },
    {
      key: "insertPosition",
      label: "Insert below the target row",
      type: "boolean",
      default: true,
      hint: "When true, insert below the target row; when false, insert above.",
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
          insertTableRow: {
            insertBelow: input.insertPosition ?? true,
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

export default documentInsertTableRow;
