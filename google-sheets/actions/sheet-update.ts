import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  range: string;
  values: unknown[][];
  valueInputOption?: string;
  includeValuesInResponse?: boolean;
}

/**
 * Overwrite cells in a range with the supplied 2D `values` array. Thin wrapper
 * over `spreadsheets.values.update` (HTTP PUT). Ranges that don't line up
 * exactly with the value dimensions are handled server-side per Google's rules.
 */
const sheetUpdate: ActionDefinition<Input> = {
  key: "sheet-update",
  type: "perform",
  resource: "sheet",
  title: "Update Rows",
  description: "Overwrite the values in a range.",
  idempotent: true,
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    {
      key: "range",
      label: "Range (A1)",
      type: "string",
      required: true,
      placeholder: "Sheet1!A2:D2",
    },
    {
      key: "values",
      label: "Values (2D)",
      type: "json",
      required: true,
      hint: "Rows × columns matching the range.",
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
      }`,
      {
        method: "PUT",
        query: {
          valueInputOption: input.valueInputOption ?? "USER_ENTERED",
          includeValuesInResponse: input.includeValuesInResponse,
        },
        body: { range: input.range, values: input.values },
      },
    );
  },
};

export default sheetUpdate;
