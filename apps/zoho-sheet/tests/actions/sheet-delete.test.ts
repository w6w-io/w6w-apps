import { assertEquals, assertRejects } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-delete.ts";

Deno.test("sheet-delete: POSTs worksheet.delete with worksheet_name", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.delete",
        worksheet_names: [{ worksheet_name: "Sheet1", worksheet_id: "0#" }],
      },
    },
  ]);
  const out = await action.execute({ resourceId: "abc123", worksheetName: "Sheet2" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.delete");
  assertEquals(body.get("worksheet_name"), "Sheet2");
  assertEquals(out.worksheets, [{ worksheet_name: "Sheet1", worksheet_id: "0#" }]);
});

Deno.test("sheet-delete: rejects with neither worksheetName nor worksheetId, no request made", async () => {
  const { ctx, calls } = mockSheetCtx([]);
  await assertRejects(
    async () => await action.execute({ resourceId: "abc123" }, ctx),
    Error,
    "worksheetName",
  );
  assertEquals(calls.length, 0);
});
