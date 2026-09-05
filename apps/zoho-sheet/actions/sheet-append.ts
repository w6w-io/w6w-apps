import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";
import { resourceId, worksheetLocator } from "../lib/params.ts";
import { requireWorksheetLocator } from "../lib/worksheet.ts";

interface Input {
  resourceId: string;
  worksheetName?: string;
  worksheetId?: string;
  headerRow?: number;
  jsonData: Array<Record<string, unknown>> | string;
}

interface Output {
  sheetName: unknown;
  startRow: unknown;
  startColumn: unknown;
  endRow: unknown;
  endColumn: unknown;
}

/**
 * `worksheet.jsondata.append` — appends rows after the worksheet's last used
 * row, matching each object's keys to the worksheet's header row (default row
 * 1). Zoho caps this at 1000 rows per call.
 */
const sheetAppend: ActionDefinition<Input, Output> = {
  key: "sheet-append",
  type: "perform",
  resource: "sheet",
  title: "Append Rows",
  description: "Append rows of JSON data after the last used row of a worksheet.",
  idempotent: false,
  params: [
    resourceId,
    ...worksheetLocator,
    {
      key: "headerRow",
      label: "Header Row",
      type: "number",
      default: 1,
      hint: "Row index holding the column headers each JSON key is matched against.",
    },
    {
      key: "jsonData",
      label: "Rows (JSON array)",
      type: "json",
      required: true,
      hint: 'Array of objects, e.g. [{"Name":"Joe","Region":"South","Units":284}]. ' +
        "Max 1000 rows per call.",
    },
  ],
  output: [
    { key: "sheetName", type: "string", label: "Worksheet written to" },
    { key: "startRow", type: "number", label: "First row written" },
    { key: "startColumn", type: "number", label: "First column written" },
    { key: "endRow", type: "number", label: "Last row written" },
    { key: "endColumn", type: "number", label: "Last column written" },
  ],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const rows = typeof input.jsonData === "string" ? JSON.parse(input.jsonData) : input.jsonData;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("`jsonData` must be a non-empty JSON array of row objects.");
    }
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      input.resourceId,
      "worksheet.jsondata.append",
      compact({
        ...locator,
        header_row: input.headerRow,
        json_data: rows,
      }),
    );
    return {
      sheetName: body.sheet_name,
      startRow: body.start_row,
      startColumn: body.start_column,
      endRow: body.end_row,
      endColumn: body.end_column,
    };
  },
};

export default sheetAppend;
