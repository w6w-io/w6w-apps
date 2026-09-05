import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-write-csv.ts";

Deno.test("sheet-write-csv: POSTs worksheet.csvdata.set with row/column/data", async () => {
  const { ctx, calls } = mockSheetCtx([
    { body: { status: "success", method: "worksheet.csvdata.set" } },
  ]);
  const out = await action.execute({
    resourceId: "abc123",
    worksheetName: "Sheet1",
    row: 3,
    column: 1,
    ignoreEmpty: true,
    data: '1,2,,"Joe"',
  }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.csvdata.set");
  assertEquals(body.get("row"), "3");
  assertEquals(body.get("column"), "1");
  assertEquals(body.get("ignore_empty"), "true");
  assertEquals(body.get("data"), '1,2,,"Joe"');
  assertEquals(out.status, "success");
});
