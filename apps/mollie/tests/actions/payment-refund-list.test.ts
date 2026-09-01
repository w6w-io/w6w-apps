import { assertEquals } from "@std/assert";
import paymentRefundList from "../../actions/payment-refund-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-refund-list: unwraps _embedded.refunds for one payment", async () => {
  const { ctx, calls } = mockCtx([{ body: list("refunds", [{ id: "re_1" }]) }]);
  const out = await paymentRefundList.execute({ paymentId: "tr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1/refunds");
  assertEquals(out, { count: 1, items: [{ id: "re_1" }] });
});
