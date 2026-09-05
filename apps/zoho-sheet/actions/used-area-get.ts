import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";
import { resourceId, worksheetLocator } from "../lib/params.ts";
import { requireWorksheetLocator } from "../lib/worksheet.ts";

interface Input {
  resourceId: string;
  worksheetName?: string;
  worksheetId?: string;
}

interface Output {
  usedRowIndex: unknown;
  usedColumnIndex: unknown;
  worksheetName: unknown;
}

/**
 * `worksheet.usedarea` — how far a worksheet's data extends. Useful ahead of
 * `sheet-read`/`sheet-append` to size a range or find the next free row
 * without reading the whole worksheet's content first.
 */
const usedAreaGet: ActionDefinition<Input, Output> = {
  key: "used-area-get",
  type: "read",
  resource: "sheet",
  title: "Get Used Area",
  description: "Return the last used row/column index of a worksheet's data.",
  params: [resourceId, ...worksheetLocator],
  output: [
    { key: "usedRowIndex", type: "number", label: "Last used row index" },
    { key: "usedColumnIndex", type: "number", label: "Last used column index" },
    { key: "worksheetName", type: "string", label: "Worksheet name" },
  ],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(input.resourceId, "worksheet.usedarea", compact(locator));
    return {
      usedRowIndex: body.used_row_index,
      usedColumnIndex: body.used_column_index,
      worksheetName: body.worksheet_name,
    };
  },
};

export default usedAreaGet;
