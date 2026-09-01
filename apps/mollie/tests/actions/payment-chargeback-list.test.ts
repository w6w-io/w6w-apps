import { assertEquals } from "@std/assert";
import paymentChargebackList from "../../actions/payment-chargeback-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-chargeback-list: unwraps _embedded.chargebacks for one payment", async () => {
  const { ctx, calls } = mockCtx([{ body: list("chargebacks", [{ id: "chb_1" }]) }]);
  const out = await paymentChargebackList.execute({ paymentId: "tr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/chargebacks");
  assertEquals(out, { count: 1, items: [{ id: "chb_1" }] });
});
