import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: hits GET /orders with the type filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("orders", [{ id: 1 }]) }]);
  const out = await orderList.execute({ type: "recurring" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/orders");
  assertEquals(queryOf(calls[0].url), { type: "recurring" });
  assertEquals(out.items, [{ id: 1 }]);
});
