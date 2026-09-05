import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-create.ts";

Deno.test("sheet-create: POSTs worksheet.insert with the new worksheet_name", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.insert",
        worksheet_names: [
          { worksheet_name: "Sheet1", worksheet_id: "0#" },
          { worksheet_name: "Sheet2", worksheet_id: "1#" },
        ],
        new_worksheet_name: "Sheet2",
      },
    },
  ]);
  const out = await action.execute({ resourceId: "abc123", worksheetName: "Sheet2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/abc123");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.insert");
  assertEquals(body.get("worksheet_name"), "Sheet2");
  assertEquals(out.newWorksheetName, "Sheet2");
});
