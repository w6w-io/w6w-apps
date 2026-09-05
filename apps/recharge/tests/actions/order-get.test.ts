import { assertEquals } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-get: hits GET /orders/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("order", { id: 9, status: "success" }) }]);
  const out = await orderGet.execute({ orderId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/orders/9");
  assertEquals(out, { id: 9, status: "success" });
});
