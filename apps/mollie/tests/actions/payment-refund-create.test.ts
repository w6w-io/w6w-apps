import { assertEquals } from "@std/assert";
import paymentRefundCreate from "../../actions/payment-refund-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-refund-create: posts {currency,value} to /payments/{id}/refunds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "re_1", status: "pending" } }]);
  const out = await paymentRefundCreate.execute(
    { paymentId: "tr_1", amountValue: "5.00", amountCurrency: "EUR" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/refunds");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { amount: { currency: "EUR", value: "5.00" } });
  assertEquals(out, { id: "re_1", status: "pending" });
});

Deno.test("payment-refund-create: is not idempotent — a retry would double-refund", () => {
  assertEquals(paymentRefundCreate.idempotent, false);
});
