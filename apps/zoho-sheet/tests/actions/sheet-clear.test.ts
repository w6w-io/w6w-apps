import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-clear.ts";

Deno.test("sheet-clear: POSTs range.content.clear with all four bounds", async () => {
  const { ctx, calls } = mockSheetCtx([
    { body: { status: "success", method: "range.content.clear" } },
  ]);
  const out = await action.execute({
    resourceId: "abc123",
    worksheetName: "Sheet1",
    startRow: 3,
    startColumn: 1,
    endRow: 5,
    endColumn: 3,
  }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "range.content.clear");
  assertEquals(body.get("start_row"), "3");
  assertEquals(body.get("end_column"), "3");
  assertEquals(out.status, "success");
});
