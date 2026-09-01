import { assertEquals } from "@std/assert";
import paymentGet from "../../actions/payment-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-get: fetches /payments/{id} with no envelope to unwrap", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1", status: "captured", amount: 50000 } }]);
  const out = await paymentGet.execute({ id: "pay_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/pay_1");
  assertEquals(out, { id: "pay_1", status: "captured", amount: 50000 });
});
