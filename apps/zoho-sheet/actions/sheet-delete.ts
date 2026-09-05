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
  worksheets: unknown[];
}

/** `worksheet.delete`. */
const sheetDelete: ActionDefinition<Input, Output> = {
  key: "sheet-delete",
  type: "perform",
  resource: "sheet",
  title: "Delete Sheet",
  description: "Permanently delete a worksheet from a workbook.",
  idempotent: true,
  params: [resourceId, ...worksheetLocator],
  output: [{ key: "worksheets", type: "array", label: "Worksheets remaining in the workbook" }],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(input.resourceId, "worksheet.delete", compact(locator));
    return { worksheets: (body.worksheet_names as unknown[] | undefined) ?? [] };
  },
};

export default sheetDelete;
