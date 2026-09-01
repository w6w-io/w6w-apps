import { assertEquals } from "@std/assert";
import paymentRefundCancel from "../../actions/payment-refund-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-refund-cancel: sends DELETE to /payments/{id}/refunds/{refundId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await paymentRefundCancel.execute({ paymentId: "tr_1", refundId: "re_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/refunds/re_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { refundId: "re_1", canceled: true });
});

Deno.test("payment-refund-cancel: is idempotent", () => {
  assertEquals(paymentRefundCancel.idempotent, true);
});
