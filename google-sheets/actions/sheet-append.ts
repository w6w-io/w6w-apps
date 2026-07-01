import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  range: string;
  values: unknown[][];
  /** `RAW` | `USER_ENTERED`. Defaults to `USER_ENTERED` so formulas are interpreted. */
  valueInputOption?: string;
  /** `OVERWRITE` | `INSERT_ROWS`. Defaults to `INSERT_ROWS`. */
  insertDataOption?: string;
  includeValuesInResponse?: boolean;
}

/**
 * Append rows to a sheet. Thin wrapper over `spreadsheets.values.append`.
 * Caller passes a 2D `values` array (rows × columns) — matching the API's
 * `ValueRange.values` shape exactly.
 */
const sheetAppend: ActionDefinition<Input> = {
  key: "sheet-append",
  type: "perform",
  resource: "sheet",
  title: "Append Row",
  description: "Append rows of values to a sheet.",
  idempotent: false,
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    {
      key: "range",
      label: "Range (A1)",
      type: "string",
      required: true,
      placeholder: "Sheet1!A:D",
    },
    {
      key: "values",
      label: "Values (2D)",
      type: "json",
      required: true,
      hint: "Rows × columns, e.g. `[[\"a\", 1], [\"b\", 2]]`.",
    },
    {
      key: "valueInputOption",
      label: "Value Input Option",
      type: "select",
      options: [
        { value: "USER_ENTERED", label: "User entered (interpret formulas)" },
        { value: "RAW", label: "Raw" },
      ],
      default: "USER_ENTERED",
    },
    {
      key: "insertDataOption",
      label: "Insert Data Option",
      type: "select",
      options: [
        { value: "INSERT_ROWS", label: "Insert new rows" },
        { value: "OVERWRITE", label: "Overwrite existing rows" },
      ],
      default: "INSERT_ROWS",
    },
    {
      key: "includeValuesInResponse",
      label: "Include values in response",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${
        encodeURIComponent(input.range)
      }:append`,
      {
        method: "POST",
        query: {
          valueInputOption: input.valueInputOption ?? "USER_ENTERED",
          insertDataOption: input.insertDataOption ?? "INSERT_ROWS",
          includeValuesInResponse: input.includeValuesInResponse,
        },
        body: { range: input.range, values: input.values },
      },
    );
  },
};

export default sheetAppend;
