import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/planning-list.ts";

Deno.test("planning-list: GETs /plannings with filter/include/sort/page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({ filter: JSON.stringify({ order_id: { eq: "o1" } }) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/plannings");
  assertEquals(url.searchParams.get("filter[order_id][eq]"), "o1");
});
