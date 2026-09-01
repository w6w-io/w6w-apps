import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/workbook-get.ts";

Deno.test("workbook-get: normalizes single-item views/tags into arrays", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        workbook: {
          id: "w1",
          name: "Sales",
          views: { view: { id: "v1", name: "Overview" } },
          tags: { tag: { label: "prod" } },
        },
      },
    }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ workbookId: "w1" }, ctx) as Record<string, unknown>;
  assertEquals(result.id, "w1");
  assertEquals(result.views, [{ id: "v1", name: "Overview" }]);
  assertEquals(result.tags, [{ label: "prod" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/workbooks/w1");
});

Deno.test("workbook-get: a workbook with no views/tags returns empty arrays, not undefined", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { workbook: { id: "w1", name: "Empty" } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ workbookId: "w1" }, ctx) as Record<string, unknown>;
  assertEquals(result.views, []);
  assertEquals(result.tags, []);
});
