import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  /** Sheet tab name (e.g. `Sheet1`). Range for the whole tab is inferred. */
  sheetName: string;
  /** Column header name to match on for the upsert. */
  columnToMatchOn: string;
  /**
   * Input rows keyed by header name. Missing headers → left blank; extra keys
   * → ignored (matches n8n's "ignore extra data" default).
   */
  rows: Array<Record<string, unknown>>;
  /** Row index (1-based) containing the header names. Defaults to 1. */
  headerRow?: number;
  valueInputOption?: string;
}

/**
 * Upsert rows by a header-name match column. Mirrors n8n's `appendOrUpdate`:
 *
 *   1. Read the sheet once (`values.get` on the whole tab) so we know the
 *      column headers and existing rows.
 *   2. Locate the match column by header name.
 *   3. For each input row, either UPDATE (single-row `values.update`) if the
 *      match value already exists, or collect it into an APPEND batch.
 *   4. Send one `values.append` at the end with the leftover rows.
 *
 * We keep the wire calls exactly to Google's spec — no batching magic.
 */
const sheetAppendOrUpdate: ActionDefinition<Input> = {
  key: "sheet-append-or-update",
  type: "perform",
  resource: "sheet",
  title: "Append or Update Row",
  description: "Upsert rows by matching on a column value (append if new, update if it exists).",
  idempotent: true,
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    { key: "sheetName", label: "Sheet Name", type: "string", required: true },
    { key: "columnToMatchOn", label: "Column to match on", type: "string", required: true },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: "Array of `{ header: value }` objects. Missing headers stay blank.",
    },
    { key: "headerRow", label: "Header Row", type: "number", default: 1 },
    {
      key: "valueInputOption",
      label: "Value Input Option",
      type: "select",
      options: [
        { value: "USER_ENTERED", label: "User entered" },
        { value: "RAW", label: "Raw" },
      ],
      default: "USER_ENTERED",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const valueInputOption = input.valueInputOption ?? "USER_ENTERED";
    const headerRow = input.headerRow ?? 1;
    const sheet = encodeURIComponent(input.sheetName);
    const spreadsheet = encodeURIComponent(input.spreadsheetId);

    // Fetch the whole tab so we know headers + existing match-column values.
    const existing = await client.request<{ values?: string[][] }>(
      `/spreadsheets/${spreadsheet}/values/${sheet}`,
      { query: { valueRenderOption: "FORMATTED_VALUE" } },
    );
    const rows = existing.values ?? [];
    const headers = rows[headerRow - 1] ?? [];
    const matchIdx = headers.indexOf(input.columnToMatchOn);
    if (matchIdx === -1) {
      throw new Error(`columnToMatchOn "${input.columnToMatchOn}" not found in header row`);
    }

    const rowValuesFor = (row: Record<string, unknown>): unknown[] =>
      headers.map((h) => (row[h] ?? "") as unknown);

    const toAppend: unknown[][] = [];
    const updated: unknown[] = [];

    for (const inputRow of input.rows) {
      const matchValue = String(inputRow[input.columnToMatchOn] ?? "");
      // Skip the header rows when scanning; row indices are 0-based here.
      let foundAt = -1;
      for (let r = headerRow; r < rows.length; r++) {
        if ((rows[r]?.[matchIdx] ?? "") === matchValue) {
          foundAt = r;
          break;
        }
      }
      if (foundAt === -1) {
        toAppend.push(rowValuesFor(inputRow));
      } else {
        // 1-based row number for A1 notation.
        const sheetRow = foundAt + 1;
        const range = `${input.sheetName}!A${sheetRow}`;
        const resp = await client.request(
          `/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}`,
          {
            method: "PUT",
            query: { valueInputOption },
            body: { range, values: [rowValuesFor(inputRow)] },
          },
        );
        updated.push(resp);
      }
    }

    let appended: unknown = null;
    if (toAppend.length) {
      const range = `${input.sheetName}!A:A`;
      appended = await client.request(
        `/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}:append`,
        {
          method: "POST",
          query: { valueInputOption, insertDataOption: "INSERT_ROWS" },
          body: { range, values: toAppend },
        },
      );
    }

    return { updated, appended, updatedCount: updated.length, appendedCount: toAppend.length };
  },
};

export default sheetAppendOrUpdate;
