import { assertEquals } from "@std/assert";
import paymentList from "../../actions/payment-list.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-list: lists payments and reports the next page", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [{ id: "pa_eXampl3", amount: 50 }],
      headers: { link: linkHeader(2, "/1.6/payments/") },
    },
  ]);
  const out = await paymentList.execute({ page: 1 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/payments/");
  assertEquals(queryOf(calls[0].url), { page: "1" });
  assertEquals(out.nextPage, 2);
});
