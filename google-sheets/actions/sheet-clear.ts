import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  range: string;
}

/**
 * Clear cell values in a range while preserving formatting. Thin wrapper over
 * `spreadsheets.values.clear`. To clear a whole sheet, pass the sheet title
 * as `range` (e.g. `"Sheet1"`).
 */
const sheetClear: ActionDefinition<Input> = {
  key: "sheet-clear",
  type: "perform",
  resource: "sheet",
  title: "Clear",
  description: "Clear cell values in a range (formatting is preserved).",
  idempotent: true,
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    {
      key: "range",
      label: "Range (A1)",
      type: "string",
      required: true,
      placeholder: "Sheet1!A2:D",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${
        encodeURIComponent(input.range)
      }:clear`,
      { method: "POST", body: {} },
    );
  },
};

export default sheetClear;
