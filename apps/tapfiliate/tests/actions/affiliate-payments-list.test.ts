import { assertEquals } from "@std/assert";
import affiliatePaymentsList from "../../actions/affiliate-payments-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-payments-list: lists payments for one affiliate", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "pa_eXampl3", amount: 50, currency: "USD" }] }]);
  const out = await affiliatePaymentsList.execute({ affiliateId: "janejameson" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/payments/");
  assertEquals(out.items, [{ id: "pa_eXampl3", amount: 50, currency: "USD" }]);
});
