import { assertEquals } from "@std/assert";
import subscriptionPaymentList from "../../actions/subscription-payment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-payment-list: hits GET /subscription_payments with scope filters", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 1,
        subscription_payments: [{ payment_key: "xyz" }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await subscriptionPaymentList.execute({ webinarId: 1 }, ctx) as {
    subscriptionPayments: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/subscription_payments");
  assertEquals(queryOf(calls[0].url).webinar_id, "1");
  assertEquals(out.subscriptionPayments, [{ payment_key: "xyz" }]);
});
