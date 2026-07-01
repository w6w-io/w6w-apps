import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  sheetId: number;
}

/**
 * Delete a single sheet (tab) from a spreadsheet via `batchUpdate/deleteSheet`.
 * Note: `sheetId` here is Google's numeric gid, NOT the sheet title.
 */
const sheetDelete: ActionDefinition<Input> = {
  key: "sheet-delete",
  type: "perform",
  resource: "sheet",
  title: "Delete Sheet",
  description: "Permanently remove a sheet tab from a spreadsheet.",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    {
      key: "sheetId",
      label: "Sheet ID (numeric)",
      type: "number",
      required: true,
      hint: "The numeric `sheetId` (gid). Use `list-sheets` to look it up.",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}:batchUpdate`,
      { method: "POST", body: { requests: [{ deleteSheet: { sheetId: input.sheetId } }] } },
    );
  },
};

export default sheetDelete;
