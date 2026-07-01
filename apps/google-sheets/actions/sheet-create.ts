import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface Input {
  spreadsheetId: string;
  title: string;
  index?: number;
  hidden?: boolean;
  rightToLeft?: boolean;
  tabColor?: string;
  sheetId?: number;
}

/**
 * Convert a hex color (e.g. `0aa55c` or `#0aa55c`) into Google's floating-point
 * `Color` shape. Not exhaustive — we don't attempt to parse `rgb()` etc.
 */
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const cleaned = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid tabColor: "${hex}" (expected 6-digit hex)`);
  }
  return {
    red: parseInt(cleaned.slice(0, 2), 16) / 255,
    green: parseInt(cleaned.slice(2, 4), 16) / 255,
    blue: parseInt(cleaned.slice(4, 6), 16) / 255,
  };
}

/**
 * Add a new sheet (tab) to an existing spreadsheet via `batchUpdate/addSheet`.
 */
const sheetCreate: ActionDefinition<Input> = {
  key: "sheet-create",
  type: "perform",
  resource: "sheet",
  title: "Create Sheet",
  description: "Add a new sheet tab to an existing spreadsheet.",
  params: [
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
    { key: "title", label: "Sheet Title", type: "string", required: true },
    { key: "index", label: "Sheet Index", type: "number" },
    { key: "hidden", label: "Hidden", type: "boolean", default: false },
    { key: "rightToLeft", label: "Right-to-Left", type: "boolean", default: false },
    { key: "tabColor", label: "Tab Color (hex)", type: "string", placeholder: "0aa55c" },
    { key: "sheetId", label: "Sheet ID", type: "number", hint: "Optional non-negative sheet ID." },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const properties: Record<string, unknown> = { title: input.title };
    if (input.index !== undefined) properties.index = input.index;
    if (input.hidden !== undefined) properties.hidden = input.hidden;
    if (input.rightToLeft !== undefined) properties.rightToLeft = input.rightToLeft;
    if (input.sheetId !== undefined) properties.sheetId = input.sheetId;
    if (input.tabColor) properties.tabColor = hexToRgb(input.tabColor);

    return client.request(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}:batchUpdate`,
      { method: "POST", body: { requests: [{ addSheet: { properties } }] } },
    );
  },
};

export default sheetCreate;
