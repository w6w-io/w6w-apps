import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-list.ts";

Deno.test("order-list: GETs /orders with filter/include/sort/page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({ filter: JSON.stringify({ status: { not_eq: "canceled" } }) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/orders");
  assertEquals(url.searchParams.get("filter[status][not_eq]"), "canceled");
});
