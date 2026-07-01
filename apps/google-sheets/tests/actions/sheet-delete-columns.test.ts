import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-delete-columns.ts";

Deno.test("sheet-delete-columns: converts letter to zero-based half-open range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  // Delete 2 columns starting at C (index 2) → [2, 4).
  await action.execute(
    { spreadsheetId: "ss-1", sheetId: 0, startColumn: "C", columnCount: 2 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  const range = body.requests[0].deleteDimension.range;
  assertEquals(range.dimension, "COLUMNS");
  assertEquals(range.startIndex, 2);
  assertEquals(range.endIndex, 4);
});
