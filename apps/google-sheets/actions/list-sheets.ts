import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
}

interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  sheetType?: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

/**
 * List the sheet tabs inside a spreadsheet. Uses `spreadsheets.get` with a
 * field mask so we don't over-fetch cell data — Google returns the whole
 * document otherwise, which can be huge.
 */
const listSheets: ActionDefinition<Input> = {
  key: "list-sheets",
  type: "read",
  resource: "sheet",
  title: "List Sheets",
  description: "List all sheet tabs (name, ID, size) inside a spreadsheet.",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
  ],
  output: [
    { key: "sheets", type: "array", label: "Sheets" },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const res = await client.request<{ sheets?: Array<{ properties?: SheetProperties }> }>(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}`,
      { query: { fields: "sheets.properties" } },
    );
    return { sheets: (res.sheets ?? []).map((s) => s.properties).filter(Boolean) };
  },
};

export default listSheets;
