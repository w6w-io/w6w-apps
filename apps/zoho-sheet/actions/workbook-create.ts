import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoSheetClient } from "../lib/client.ts";

interface Input {
  workbookName: string;
  parentId?: string;
}

interface Output {
  resourceId: unknown;
  workbookName: unknown;
  workbookUrl: unknown;
  worksheetName: unknown;
  worksheetId: unknown;
}

/** `workbook.create` at `POST /api/v2/create` — the other no-`resource_id` path. */
const workbookCreate: ActionDefinition<Input, Output> = {
  key: "workbook-create",
  type: "perform",
  resource: "workbook",
  title: "Create Workbook",
  description: "Create a new, blank Zoho Sheet workbook.",
  idempotent: false,
  params: [
    { key: "workbookName", label: "Workbook Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Destination Folder ID",
      type: "string",
      hint: "Optional Zoho WorkDrive folder id. Defaults to My Folder.",
    },
  ],
  output: [
    { key: "resourceId", type: "string", label: "New workbook's resource_id" },
    { key: "workbookName", type: "string", label: "Workbook name" },
    { key: "workbookUrl", type: "string", label: "Workbook URL" },
    { key: "worksheetName", type: "string", label: "Default worksheet name" },
    { key: "worksheetId", type: "string", label: "Default worksheet id" },
  ],

  async execute(input, ctx) {
    const client = new ZohoSheetClient(ctx);
    const body = await client.call(
      "create",
      "workbook.create",
      compact({
        workbook_name: input.workbookName,
        parent_id: input.parentId,
      }),
    );
    return {
      resourceId: body.resource_id,
      workbookName: body.workbook_name,
      workbookUrl: body.workbook_url,
      worksheetName: body.worksheet_name,
      worksheetId: body.worksheet_id,
    };
  },
};

export default workbookCreate;
