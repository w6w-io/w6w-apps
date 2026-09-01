import { assertEquals } from "@std/assert";
import paymentCreate from "../../actions/payment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-create: posts description/amount as {currency,value} to /payments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tr_1", status: "open" } }]);
  const out = await paymentCreate.execute(
    {
      description: "Order #1",
      amountValue: "10.00",
      amountCurrency: "EUR",
      redirectUrl: "https://example.org/return",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/payments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    description: "Order #1",
    amount: { currency: "EUR", value: "10.00" },
    redirectUrl: "https://example.org/return",
  });
  assertEquals(out, { id: "tr_1", status: "open" });
});

Deno.test("payment-create: is not idempotent — every call starts a separate payment", () => {
  assertEquals(paymentCreate.idempotent, false);
});
