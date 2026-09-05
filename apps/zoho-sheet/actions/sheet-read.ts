import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";
import { rangeBounds, resourceId, worksheetLocator } from "../lib/params.ts";
import { requireWorksheetLocator } from "../lib/worksheet.ts";

interface Input {
  resourceId: string;
  worksheetName?: string;
  worksheetId?: string;
  startRow?: number;
  startColumn?: number;
  endRow?: number;
  endColumn?: number;
  visibleRowsOnly?: boolean;
  visibleColumnsOnly?: boolean;
  responseType?: string;
  majorDimension?: string;
}

interface Output {
  rangeDetails: unknown;
  usedRow: unknown;
  usedColumn: unknown;
}

/**
 * `worksheet.content.get` — reads a bounded range when any of the four
 * bounds are given, or the whole used area of the worksheet otherwise. A
 * superset of the narrower `range.content.get` operation (same response
 * shape, plus visibility filtering and an array response option), so this
 * app exposes only this one.
 */
const sheetRead: ActionDefinition<Input, Output> = {
  key: "sheet-read",
  type: "read",
  resource: "sheet",
  title: "Read Rows",
  description: "Read cell content from a worksheet, optionally bounded to a range.",
  params: [
    resourceId,
    ...worksheetLocator,
    ...rangeBounds,
    {
      key: "visibleRowsOnly",
      label: "Visible Rows Only",
      type: "boolean",
      default: false,
      hint: "Skip hidden rows.",
    },
    {
      key: "visibleColumnsOnly",
      label: "Visible Columns Only",
      type: "boolean",
      default: false,
      hint: "Skip hidden columns.",
    },
    {
      key: "responseType",
      label: "Response Shape",
      type: "select",
      options: [
        { value: "default", label: "Default (row/column index objects)" },
        { value: "array", label: "2D array" },
      ],
      default: "default",
    },
    {
      key: "majorDimension",
      label: "Major Dimension",
      type: "select",
      options: [
        { value: "rows", label: "Rows" },
        { value: "columns", label: "Columns" },
      ],
      hint: 'Required only when Response Shape is "2D array".',
    },
  ],
  output: [
    { key: "rangeDetails", type: "object", label: "Cell content, shaped by Response Shape" },
    { key: "usedRow", type: "number", label: "Last used row index" },
    { key: "usedColumn", type: "number", label: "Last used column index" },
  ],

  async execute(input, ctx) {
    const locator = requireWorksheetLocator(input);
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      input.resourceId,
      "worksheet.content.get",
      compact({
        ...locator,
        start_row: input.startRow,
        start_column: input.startColumn,
        end_row: input.endRow,
        end_column: input.endColumn,
        visible_rows_only: input.visibleRowsOnly,
        visible_columns_only: input.visibleColumnsOnly,
        response_type: input.responseType,
        major_dimension: input.majorDimension,
      }),
    );
    return {
      rangeDetails: body.range_details,
      usedRow: body.used_row,
      usedColumn: body.used_column,
    };
  },
};

export default sheetRead;
