import { assertEquals } from "@std/assert";
import customerPaymentCreate from "../../actions/customer-payment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-payment-create: posts to /customers/{id}/payments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tr_1", status: "open" } }]);
  const out = await customerPaymentCreate.execute(
    {
      customerId: "cst_1",
      description: "Order #1",
      amountValue: "10.00",
      amountCurrency: "EUR",
      redirectUrl: "https://example.org/return",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/payments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    description: "Order #1",
    amount: { currency: "EUR", value: "10.00" },
    redirectUrl: "https://example.org/return",
  });
  assertEquals(out, { id: "tr_1", status: "open" });
});
