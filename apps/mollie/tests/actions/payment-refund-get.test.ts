import { assertEquals } from "@std/assert";
import paymentRefundGet from "../../actions/payment-refund-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-refund-get: fetches /payments/{id}/refunds/{refundId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "re_1", status: "refunded" } }]);
  const out = await paymentRefundGet.execute({ paymentId: "tr_1", refundId: "re_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/refunds/re_1");
  assertEquals(out, { id: "re_1", status: "refunded" });
});
