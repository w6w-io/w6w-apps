import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-delete-rows.ts";

Deno.test("sheet-delete-rows: batchUpdate/deleteDimension ROWS with zero-based half-open range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  // Delete 3 rows starting at row 2 (1-based) → zero-based [1, 4).
  await action.execute({ spreadsheetId: "ss-1", sheetId: 7, startRow: 2, rowCount: 3 }, ctx);
  const body = JSON.parse(calls[0].body!);
  const range = body.requests[0].deleteDimension.range;
  assertEquals(range.sheetId, 7);
  assertEquals(range.dimension, "ROWS");
  assertEquals(range.startIndex, 1);
  assertEquals(range.endIndex, 4);
});

Deno.test("sheet-delete-rows: defaults to a single row", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spreadsheetId: "ss-1", sheetId: 0, startRow: 5 }, ctx);
  const body = JSON.parse(calls[0].body!);
  const range = body.requests[0].deleteDimension.range;
  assertEquals(range.startIndex, 4);
  assertEquals(range.endIndex, 5);
});
