import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  rowIndex: number;
  columnIndex: number;
  index: number;
  /** `true` = insertRight (default), `false` = insertLeft. */
  insertPosition?: boolean;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/** `insertTableColumn` — insert a column to the left or right of a target cell. */
const documentInsertTableColumn: ActionDefinition<Input> = {
  key: "document-insert-table-column",
  type: "perform",
  resource: "document",
  title: "Insert Table Column",
  description: "Insert a table column to the left or right of an existing cell.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "index", label: "Table Start Index", type: "number", required: true },
    { key: "rowIndex", label: "Row Index", type: "number", required: true },
    { key: "columnIndex", label: "Column Index", type: "number", required: true },
    {
      key: "insertPosition",
      label: "Insert right of the target column",
      type: "boolean",
      default: true,
      hint: "When true, insert to the right of the target column; when false, to the left.",
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
          insertTableColumn: {
            insertRight: input.insertPosition ?? true,
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

export default documentInsertTableColumn;
