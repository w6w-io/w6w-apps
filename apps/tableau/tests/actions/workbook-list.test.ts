import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/workbook-list.ts";

Deno.test("workbook-list: unwraps a single workbook and targets the right path", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { workbooks: { workbook: { id: "w1", name: "Sales" } } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx) as { workbooks: unknown[] };
  assertEquals(result.workbooks, [{ id: "w1", name: "Sales" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/workbooks");
});

Deno.test("workbook-list: limit caps a bounded read", async () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ id: `w${i}` }));
  const { ctx } = mockCtx(
    [{ status: 200, body: { workbooks: { workbook: many } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ limit: 3 }, ctx) as { workbooks: unknown[] };
  assertEquals(result.workbooks.length, 3);
});
