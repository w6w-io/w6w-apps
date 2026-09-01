import { assertEquals } from "@std/assert";
import paymentList from "../../actions/payment-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-list: lists /payments with the from/to/count/skip window", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "pay_1" }]) }]);
  await paymentList.execute({ from: 1000, to: 2000, count: 5, skip: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments");
  assertEquals(queryOf(calls[0].url), { from: "1000", to: "2000", count: "5", skip: "10" });
});
