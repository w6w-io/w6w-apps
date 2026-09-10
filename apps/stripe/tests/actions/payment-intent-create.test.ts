import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-intent-create.ts";

Deno.test("payment-intent-create: POSTs /payment_intents with amount and currency", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pi_1", status: "requires_payment_method" } }]);
  await action.execute({ amount: 1000, currency: "usd" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/payment_intents");
  assertEquals(calls[0].body, "amount=1000&currency=usd");
});

Deno.test("payment-intent-create: maps the camelCase params onto Stripe's names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      amount: 500,
      currency: "gbp",
      customerId: "cus_1",
      paymentMethod: "pm_1",
      captureMethod: "manual",
      confirm: true,
      receiptEmail: "a@b.test",
    },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("customer"), "cus_1");
  assertEquals(body.get("payment_method"), "pm_1");
  assertEquals(body.get("capture_method"), "manual");
  assertEquals(body.get("receipt_email"), "a@b.test");
  assertEquals(body.get("confirm"), "true");
});

Deno.test("payment-intent-create: forwards setupFutureUsage and statementDescriptor", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      amount: 500,
      currency: "usd",
      setupFutureUsage: "off_session",
      statementDescriptor: "ACME ORDER",
    },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("setup_future_usage"), "off_session");
  assertEquals(body.get("statement_descriptor"), "ACME ORDER");
});

Deno.test("payment-intent-create: the amount hint spells out the smallest-unit rule", () => {
  const amount = action.params?.find((p) => p.key === "amount");
  assert(amount?.hint?.includes("1000 = $10.00"));
});
