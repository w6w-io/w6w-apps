import { assertEquals } from "@std/assert";
import action from "../../actions/analytics-report-get.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("analytics-report-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { some: "data" } }]);
  const out = await action.execute({ id: "rep-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/analytics/reports/rep-1");
  assertEquals(out, { some: "data" });
});

Deno.test("analytics-report-get: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
