import { assertEquals } from "@std/assert";
import orderPaymentsList from "../../actions/order-payments-list.ts";
import { collection, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-payments-list: fetches /orders/{id}/payments", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "pay_1" }]) }]);
  const out = await orderPaymentsList.execute({ id: "order_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/orders/order_1/payments");
  assertEquals(out, collection([{ id: "pay_1" }]));
});
