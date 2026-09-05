import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/used-area-get.ts";

Deno.test("used-area-get: POSTs worksheet.usedarea and returns the bounds", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.usedarea",
        used_row_index: 10,
        used_column_index: 3,
        worksheet_name: "Sheet2",
      },
    },
  ]);
  const out = await action.execute({ resourceId: "abc123", worksheetId: "2#" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.usedarea");
  assertEquals(body.get("worksheet_id"), "2#");
  assertEquals(out, { usedRowIndex: 10, usedColumnIndex: 3, worksheetName: "Sheet2" });
});
