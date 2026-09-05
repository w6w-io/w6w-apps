import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/payment-get.ts";

Deno.test("payment-get: retrieves a payment via Object Query, not the feature-gated classic endpoint", async () => {
  const { ctx, calls } = mockCtx([one({ id: "pay1", amount: 50 })], { display });
  const result = await action.execute!({ paymentKey: "P-00000001" }, ctx) as {
    payment: { amount: number };
  };
  assertEquals(calls[0].url, "https://rest.zuora.com/object-query/payments/P-00000001");
  assertEquals(result.payment.amount, 50);
});
