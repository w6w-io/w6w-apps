import { assertEquals } from "@std/assert";
import { mockSheetCtx } from "../_helpers.ts";
import action from "../../actions/workbook-list.ts";

Deno.test("workbook-list: POSTs workbook.list to /api/v2/workbooks with no resource_id", async () => {
  const { ctx, calls } = mockSheetCtx([
    {
      body: {
        status: "success",
        method: "workbook.list",
        workbooks: [{ resource_id: "abc", workbook_name: "Test" }],
        resource_count: 1,
      },
    },
  ]);
  const out = await action.execute({ sortOption: "recently_modified" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/workbooks");
  assertEquals(calls[0].method, "POST");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("method"), "workbook.list");
  assertEquals(body.get("sort_option"), "recently_modified");
  assertEquals(body.has("start_index"), false);
  assertEquals(out.workbooks, [{ resource_id: "abc", workbook_name: "Test" }]);
  assertEquals(out.resourceCount, 1);
});
