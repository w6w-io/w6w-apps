import { assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/view-list-for-workbook.ts";

Deno.test("view-list-for-workbook: targets the workbook's own /views and unwraps a single view", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { views: { view: { id: "v1", name: "Overview" } } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ workbookId: "w1" }, ctx) as { views: unknown[] };
  assertEquals(result.views, [{ id: "v1", name: "Overview" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/workbooks/w1/views");
});

Deno.test("view-list-for-workbook: requires a workbookId before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(
    () => Promise.resolve(action.execute!({}, ctx)),
    Error,
    "`workbookId` is required",
  );
  assertEquals(calls.length, 0);
});
