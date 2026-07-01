import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";

interface SheetSpec {
  title: string;
  hidden?: boolean;
}

interface Input {
  title: string;
  sheets?: SheetSpec[];
  locale?: string;
  /** `ON_CHANGE`, `MINUTE`, `HOUR` — matches Google's `RecalculationInterval`. */
  autoRecalc?: string;
}

const spreadsheetCreate: ActionDefinition<Input> = {
  key: "spreadsheet-create",
  type: "perform",
  resource: "spreadsheet",
  title: "Create Spreadsheet",
  description: "Create a new Google spreadsheet (optionally with initial sheet tabs).",
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "sheets",
      label: "Sheets",
      type: "group",
      repeat: true,
      hint: "Initial sheet tabs to create alongside the spreadsheet.",
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "en_US" },
    {
      key: "autoRecalc",
      label: "Recalculation Interval",
      type: "select",
      options: [
        { value: "ON_CHANGE", label: "On Change" },
        { value: "MINUTE", label: "Minute" },
        { value: "HOUR", label: "Hour" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const body: Record<string, unknown> = {
      properties: {
        title: input.title,
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.autoRecalc ? { autoRecalc: input.autoRecalc } : {}),
      },
    };
    if (input.sheets?.length) {
      body.sheets = input.sheets.map((s) => ({
        properties: { title: s.title, hidden: s.hidden ?? false },
      }));
    }
    return client.request("/spreadsheets", { method: "POST", body });
  },
};

export default spreadsheetCreate;
