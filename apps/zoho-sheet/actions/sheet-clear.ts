import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";
import { resourceId, worksheetLocator } from "../lib/params.ts";
import { requireWorksheetLocator } from "../lib/worksheet.ts";

interface Input {
  resourceId: string;
  worksheetName?: string;
  worksheetId?: string;
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

interface Output {
  status: unknown;
}

/**
 * `range.content.clear` — clears only cell CONTENT in the given range. Any
 * style/format applied to those cells is left intact. The sibling
 * `range.clear` operation (which also strips style/format) is left out of
 * this app: clearing content is the workflow-automation case and the more
 * conservative default; a workflow that also needs formatting wiped can chain
 * a second, explicit step once that's needed.
 */
const sheetClear: ActionDefinition<Input, Output> = {
  key: "sheet-clear",
  type: "perform",
  resource: "sheet",
  title: "Clear Range",
  description: "Clear the content of a range, leaving formatting/style intact.",
  idempotent: true,
  params: [
    resourceId,
    ...worksheetLocator,
    { key: "startRow", label: "Start Row", type: "number", required: true },
    { key: "startColumn", label: "Start Column", type: "number", required: true },
    { key: "endRow", label: "End Row", type: "number", required: true },
    { key: "endColumn", label: "End Column", type: "number", required: true },
  ],
  output: [{ key: "status", type: "string", label: '"success" once cleared' }],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      input.resourceId,
      "range.content.clear",
      compact({
        ...locator,
        start_row: input.startRow,
        start_column: input.startColumn,
        end_row: input.endRow,
        end_column: input.endColumn,
      }),
    );
    return { status: body.status };
  },
};

export default sheetClear;
