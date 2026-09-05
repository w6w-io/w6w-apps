import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";
import { resourceId, worksheetLocator } from "../lib/params.ts";
import { requireWorksheetLocator } from "../lib/worksheet.ts";

interface Input {
  resourceId: string;
  worksheetName?: string;
  worksheetId?: string;
  row: number;
  column: number;
  ignoreEmpty?: boolean;
  data: string;
}

interface Output {
  status: unknown;
}

/**
 * `worksheet.csvdata.set` — Zoho's own operation title is "Set content to
 * range", but the wire shape is CSV text, not a JSON grid: it OVERWRITES
 * existing content starting at the given cell with the parsed CSV. Named for
 * what it actually does rather than the vendor's title, to avoid it reading
 * like a JSON-array write the way `sheet-append` is.
 */
const sheetWriteCsv: ActionDefinition<Input, Output> = {
  key: "sheet-write-csv",
  type: "perform",
  resource: "sheet",
  title: "Write Range (CSV)",
  description:
    "Overwrite a range with CSV data, starting at a given cell. Existing content in the " +
    "overwritten cells is replaced.",
  idempotent: false,
  params: [
    resourceId,
    ...worksheetLocator,
    { key: "row", label: "Start Row", type: "number", required: true },
    { key: "column", label: "Start Column", type: "number", required: true },
    {
      key: "ignoreEmpty",
      label: "Ignore Empty Values",
      type: "boolean",
      default: false,
      hint: "Skip empty CSV fields instead of writing them as blank cells.",
    },
    {
      key: "data",
      label: "CSV Data",
      type: "text",
      required: true,
      placeholder: '1,2,,"Joe"',
    },
  ],
  output: [{ key: "status", type: "string", label: '"success" once written' }],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      input.resourceId,
      "worksheet.csvdata.set",
      compact({
        ...locator,
        row: input.row,
        column: input.column,
        ignore_empty: input.ignoreEmpty,
        data: input.data,
      }),
    );
    return { status: body.status };
  },
};

export default sheetWriteCsv;
