import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import spreadsheetCreate from "./actions/spreadsheet-create.ts";
import spreadsheetDelete from "./actions/spreadsheet-delete.ts";
import listSheets from "./actions/list-sheets.ts";
import sheetCreate from "./actions/sheet-create.ts";
import sheetDelete from "./actions/sheet-delete.ts";
import sheetRead from "./actions/sheet-read.ts";
import sheetAppend from "./actions/sheet-append.ts";
import sheetUpdate from "./actions/sheet-update.ts";
import sheetAppendOrUpdate from "./actions/sheet-append-or-update.ts";
import sheetClear from "./actions/sheet-clear.ts";
import sheetDeleteRows from "./actions/sheet-delete-rows.ts";
import sheetDeleteColumns from "./actions/sheet-delete-columns.ts";

export default {
  actions: [
    spreadsheetCreate,
    spreadsheetDelete,
    listSheets,
    sheetCreate,
    sheetDelete,
    sheetRead,
    sheetAppend,
    sheetUpdate,
    sheetAppendOrUpdate,
    sheetClear,
    sheetDeleteRows,
    sheetDeleteColumns,
  ],
  auth: [oauth2, serviceAccount],
} satisfies AppDefinition;
