import { assertEquals } from "@std/assert";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-create: posts amount/interval/description to /customers/{id}/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sub_1", status: "active" } }]);
  const out = await subscriptionCreate.execute(
    {
      customerId: "cst_1",
      amountValue: "9.99",
      amountCurrency: "EUR",
      interval: "1 month",
      description: "Monthly plan",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    amount: { currency: "EUR", value: "9.99" },
    interval: "1 month",
    description: "Monthly plan",
  });
  assertEquals(out, { id: "sub_1", status: "active" });
});

Deno.test("subscription-create: is not idempotent", () => {
  assertEquals(subscriptionCreate.idempotent, false);
});
