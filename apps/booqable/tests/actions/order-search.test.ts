import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-search.ts";

Deno.test("order-search: POSTs /orders/search with the filter tree in the body", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [{ id: "1" }] } }]);
  await action.execute({ filter: JSON.stringify({ customer_id: { eq: "cust-1" } }) }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/orders/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter.customer_id.eq, "cust-1");
});
