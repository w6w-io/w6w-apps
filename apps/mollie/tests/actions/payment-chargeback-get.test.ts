import { assertEquals } from "@std/assert";
import paymentChargebackGet from "../../actions/payment-chargeback-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-chargeback-get: fetches /payments/{id}/chargebacks/{chargebackId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chb_1" } }]);
  const out = await paymentChargebackGet.execute({ paymentId: "tr_1", chargebackId: "chb_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/chargebacks/chb_1");
  assertEquals(out, { id: "chb_1" });
});
