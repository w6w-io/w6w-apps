import { assertEquals, assertRejects } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-append.ts";

Deno.test("sheet-append: POSTs worksheet.jsondata.append with JSON-stringified rows", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.jsondata.append",
        sheet_name: "Sheet1",
        start_row: 10,
        start_column: 1,
        end_row: 11,
        end_column: 3,
      },
    },
  ]);
  const rows = [{ Name: "Joe", Region: "South", Units: 284 }];
  const out = await action.execute({
    resourceId: "abc123",
    worksheetName: "Sheet1",
    jsonData: rows,
  }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.jsondata.append");
  assertEquals(JSON.parse(body.get("json_data")!), rows);
  assertEquals(out.sheetName, "Sheet1");
  assertEquals(out.startRow, 10);
});

Deno.test("sheet-append: accepts a JSON string and parses it", async () => {
  const { ctx, calls } = mockSheetCtx([
    { body: { status: "success", method: "worksheet.jsondata.append" } },
  ]);
  await action.execute(
    { resourceId: "abc123", worksheetId: "0#", jsonData: '[{"Name":"Joe"}]' },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(JSON.parse(body.get("json_data")!), [{ Name: "Joe" }]);
});

Deno.test("sheet-append: rejects an empty row array without making a request", async () => {
  const { ctx, calls } = mockSheetCtx([]);
  await assertRejects(
    async () =>
      await action.execute({ resourceId: "abc123", worksheetName: "Sheet1", jsonData: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});
