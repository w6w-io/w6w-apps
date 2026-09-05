import type { ActionDefinition } from "@w6w/types";
import { ZohoSheetClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
}

interface Output {
  worksheets: unknown[];
}

/** `worksheet.list` — every documented worksheet/content operation addresses `/api/v2/<resource_id>`. */
const sheetList: ActionDefinition<Input, Output> = {
  key: "sheet-list",
  type: "read",
  resource: "sheet",
  title: "List Sheets",
  description: "List the worksheets inside a workbook.",
  params: [resourceId],
  output: [{ key: "worksheets", type: "array", label: "Worksheets (name + id)" }],

  async execute(input, ctx) {
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(input.resourceId, "worksheet.list");
    return { worksheets: (body.worksheet_names as unknown[] | undefined) ?? [] };
  },
};

export default sheetList;
