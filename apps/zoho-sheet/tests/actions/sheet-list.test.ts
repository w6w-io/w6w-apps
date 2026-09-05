import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/sheet-list.ts";

Deno.test("sheet-list: POSTs worksheet.list to /api/v2/<resource_id>", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "worksheet.list",
        worksheet_names: [{ worksheet_name: "Sheet1", worksheet_id: "0#" }],
      },
    },
  ]);
  const out = await action.execute({ resourceId: "abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/abc123");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "worksheet.list");
  assertEquals(out.worksheets, [{ worksheet_name: "Sheet1", worksheet_id: "0#" }]);
});
