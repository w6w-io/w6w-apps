import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  sheetId: number;
  /** 1-based row number (the first row is 1), matching Google's UI. */
  startRow: number;
  /** Number of rows to delete (defaults to 1). */
  rowCount?: number;
}

/**
 * Delete N rows starting at `startRow` (1-based, matching the sheet UI).
 * Thin wrapper over `batchUpdate/deleteDimension` with `dimension: ROWS`.
 * The Google API takes half-open [startIndex, endIndex) *zero-based* — we
 * translate here so callers can think in sheet coordinates.
 */
const sheetDeleteRows: ActionDefinition<Input> = {
  key: "sheet-delete-rows",
  type: "perform",
  resource: "sheet",
  title: "Delete Rows",
  description: "Delete a contiguous block of rows from a sheet.",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    { key: "sheetId", label: "Sheet ID (numeric)", type: "number", required: true },
    { key: "startRow", label: "Start Row (1-based)", type: "number", required: true },
    { key: "rowCount", label: "Number of Rows", type: "number", default: 1 },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const count = input.rowCount ?? 1;
    const startIndex = input.startRow - 1;
    const endIndex = startIndex + count;
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: {
          requests: [
            {
              deleteDimension: {
                range: { sheetId: input.sheetId, dimension: "ROWS", startIndex, endIndex },
              },
            },
          ],
        },
      },
    );
  },
};

export default sheetDeleteRows;
