import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: lists /orders with compacted pagination and a boolean-to-0/1 filter", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "order_1" }]) }]);
  await orderList.execute({ count: 20, authorized: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/orders");
  assertEquals(queryOf(calls[0].url), { count: "20", authorized: "1" });
});

Deno.test("order-list: authorized=false is sent as 0, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await orderList.execute({ authorized: false }, ctx);

  assertEquals(queryOf(calls[0].url).authorized, "0");
});
