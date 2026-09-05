import type { ActionDefinition } from "@w6w/types";
import { ZohoSheetClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  worksheetName: string;
}

interface Output {
  worksheets: unknown[];
  newWorksheetName: unknown;
}

/** `worksheet.insert`. Zoho caps a workbook at 256 worksheets and a name at 31 characters. */
const sheetCreate: ActionDefinition<Input, Output> = {
  key: "sheet-create",
  type: "perform",
  resource: "sheet",
  title: "Create Sheet",
  description: "Add a new worksheet to a workbook.",
  idempotent: false,
  params: [
    resourceId,
    {
      key: "worksheetName",
      label: "New Worksheet Name",
      type: "string",
      required: true,
      hint: "Max 31 characters; must be unique within the workbook.",
    },
  ],
  output: [
    { key: "worksheets", type: "array", label: "Every worksheet now in the workbook" },
    { key: "newWorksheetName", type: "string", label: "Name assigned to the new worksheet" },
  ],

  async execute(input, ctx) {
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(input.resourceId, "worksheet.insert", {
      worksheet_name: input.worksheetName,
    });
    return {
      worksheets: (body.worksheet_names as unknown[] | undefined) ?? [],
      newWorksheetName: body.new_worksheet_name,
    };
  },
};

export default sheetCreate;
