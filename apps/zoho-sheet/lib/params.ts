import type { Param } from "@w6w/types";

export const resourceId: Param = {
  key: "resourceId",
  label: "Workbook ID",
  type: "string",
  required: true,
  hint: "The Zoho Sheet workbook's resource_id (returned by List Workbooks / Create Workbook).",
};

export const worksheetName: Param = {
  key: "worksheetName",
  label: "Worksheet Name",
  type: "string",
  hint: 'Name of the worksheet, e.g. "Sheet1". Either this or Worksheet ID is required.',
};

export const worksheetId: Param = {
  key: "worksheetId",
  label: "Worksheet ID",
  type: "string",
  hint: 'Alternative to Worksheet Name (e.g. "0#"). Either this or Worksheet Name is required.',
};

/** Both point at the same worksheet — Zoho accepts either, one is required. */
export const worksheetLocator: Param[] = [worksheetName, worksheetId];

export const rangeBounds: Param[] = [
  { key: "startRow", label: "Start Row", type: "number", hint: "1-based row index." },
  { key: "startColumn", label: "Start Column", type: "number", hint: "1-based column index." },
  { key: "endRow", label: "End Row", type: "number", hint: "1-based row index." },
  { key: "endColumn", label: "End Column", type: "number", hint: "1-based column index." },
];
