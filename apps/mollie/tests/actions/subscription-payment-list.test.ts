import { assertEquals } from "@std/assert";
import subscriptionPaymentList from "../../actions/subscription-payment-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-payment-list: unwraps _embedded.payments for one subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: list("payments", [{ id: "tr_1" }]) }]);
  const out = await subscriptionPaymentList.execute(
    { customerId: "cst_1", subscriptionId: "sub_1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions/sub_1/payments");
  assertEquals(out, { count: 1, items: [{ id: "tr_1" }] });
});
