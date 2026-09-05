import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-list: calls GET /1/Orders", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await orderList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/Orders");
  assertEquals(out.items.length, 1);
});
