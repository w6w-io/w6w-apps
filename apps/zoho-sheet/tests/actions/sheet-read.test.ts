import { assertEquals, assertRejects } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-read.ts";

Deno.test("sheet-read: POSTs worksheet.content.get with bounds and options", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.content.get",
        range_details: [{ row_index: 2, row_details: [{ column_index: 3, content: "d" }] }],
        used_row: 27,
        used_column: 9,
      },
    },
  ]);
  const out = await action.execute({
    resourceId: "abc123",
    worksheetName: "Sheet1",
    startRow: 2,
    startColumn: 3,
    endRow: 4,
    endColumn: 4,
    visibleRowsOnly: true,
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/abc123");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.content.get");
  assertEquals(body.get("worksheet_name"), "Sheet1");
  assertEquals(body.get("start_row"), "2");
  assertEquals(body.get("visible_rows_only"), "true");
  assertEquals(out.usedRow, 27);
  assertEquals(out.usedColumn, 9);
});

Deno.test("sheet-read: rejects with neither worksheetName nor worksheetId", async () => {
  const { ctx, calls } = mockSheetCtx([]);
  await assertRejects(
    async () => await action.execute({ resourceId: "abc123" }, ctx),
    Error,
    "worksheetName",
  );
  assertEquals(calls.length, 0);
});
