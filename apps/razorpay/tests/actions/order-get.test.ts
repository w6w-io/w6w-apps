import { assertEquals } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-get: fetches /orders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "order_1", status: "paid" } }]);
  const out = await orderGet.execute({ id: "order_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/orders/order_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "order_1", status: "paid" });
});
