import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/workbook-create.ts";

Deno.test("workbook-create: POSTs workbook.create to /api/v2/create", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "workbook.create",
        resource_id: "abc123",
        workbook_name: "Sheet1",
        workbook_url: "https://sheet.zoho.com/sheet/open/abc123",
        worksheet_name: "Sheet1",
        worksheet_id: "0#",
      },
    },
  ]);
  const out = await action.execute({ workbookName: "Sheet1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/create");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "workbook.create");
  assertEquals(body.get("workbook_name"), "Sheet1");
  assertEquals(body.has("parent_id"), false);
  assertEquals(out, {
    resourceId: "abc123",
    workbookName: "Sheet1",
    workbookUrl: "https://sheet.zoho.com/sheet/open/abc123",
    worksheetName: "Sheet1",
    worksheetId: "0#",
  });
});
