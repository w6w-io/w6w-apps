import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: GETs /orders/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "o1" } } }]);
  await action.execute({ orderId: "o1", include: "customer,lines" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/orders/o1");
  assertEquals(url.searchParams.get("include"), "customer,lines");
});
