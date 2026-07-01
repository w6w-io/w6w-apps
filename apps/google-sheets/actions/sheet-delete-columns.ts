import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient, columnLetterToIndex } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  sheetId: number;
  /** Column letter (A, B, …, AA). Matches the sheet UI. */
  startColumn: string;
  /** Number of columns to delete (defaults to 1). */
  columnCount?: number;
}

/**
 * Delete N columns starting at `startColumn` (letter, matching the sheet UI).
 * Thin wrapper over `batchUpdate/deleteDimension` with `dimension: COLUMNS`.
 * `columnLetterToIndex` converts to Google's half-open zero-based range.
 */
const sheetDeleteColumns: ActionDefinition<Input> = {
  key: "sheet-delete-columns",
  type: "perform",
  resource: "sheet",
  title: "Delete Columns",
  description: "Delete a contiguous block of columns from a sheet.",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    { key: "sheetId", label: "Sheet ID (numeric)", type: "number", required: true },
    { key: "startColumn", label: "Start Column (letter)", type: "string", required: true },
    { key: "columnCount", label: "Number of Columns", type: "number", default: 1 },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const count = input.columnCount ?? 1;
    const startIndex = columnLetterToIndex(input.startColumn);
    const endIndex = startIndex + count;
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: {
          requests: [
            {
              deleteDimension: {
                range: { sheetId: input.sheetId, dimension: "COLUMNS", startIndex, endIndex },
              },
            },
          ],
        },
      },
    );
  },
};

export default sheetDeleteColumns;
