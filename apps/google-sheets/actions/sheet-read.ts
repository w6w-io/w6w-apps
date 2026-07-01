import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  range: string;
  /** `FORMATTED_VALUE` | `UNFORMATTED_VALUE` | `FORMULA`. Defaults to `FORMATTED_VALUE`. */
  valueRenderOption?: string;
  /** `SERIAL_NUMBER` | `FORMATTED_STRING`. */
  dateTimeRenderOption?: string;
  /** `ROWS` (default) or `COLUMNS`. */
  majorDimension?: string;
}

/**
 * Read cell values from an A1-notation range. Thin wrapper over
 * `spreadsheets.values.get` — we intentionally don't try to auto-map into
 * `{ header: value }` objects here; that's the caller's job.
 */
const sheetRead: ActionDefinition<Input> = {
  key: "sheet-read",
  type: "read",
  resource: "sheet",
  title: "Read Rows",
  description: "Return cell values from a range (A1 notation).",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    {
      key: "range",
      label: "Range (A1)",
      type: "string",
      required: true,
      placeholder: "Sheet1!A1:D10",
    },
    {
      key: "valueRenderOption",
      label: "Value Render Option",
      type: "select",
      options: [
        { value: "FORMATTED_VALUE", label: "Formatted value" },
        { value: "UNFORMATTED_VALUE", label: "Unformatted value" },
        { value: "FORMULA", label: "Formula" },
      ],
      default: "FORMATTED_VALUE",
    },
    {
      key: "dateTimeRenderOption",
      label: "Date/Time Render Option",
      type: "select",
      options: [
        { value: "SERIAL_NUMBER", label: "Serial number" },
        { value: "FORMATTED_STRING", label: "Formatted string" },
      ],
    },
    {
      key: "majorDimension",
      label: "Major Dimension",
      type: "select",
      options: [
        { value: "ROWS", label: "Rows" },
        { value: "COLUMNS", label: "Columns" },
      ],
      default: "ROWS",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${
        encodeURIComponent(input.range)
      }`,
      {
        query: {
          valueRenderOption: input.valueRenderOption ?? "FORMATTED_VALUE",
          dateTimeRenderOption: input.dateTimeRenderOption,
          majorDimension: input.majorDimension ?? "ROWS",
        },
      },
    );
  },
};

export default sheetRead;
