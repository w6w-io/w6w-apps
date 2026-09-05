import { assert, assertEquals } from "@std/assert";
import paymentMethodList from "../../actions/payment-method-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-method-list: hits GET /payment_methods with the customer filter", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: listEnvelope("payment_methods", [
        { id: 1, payment_details: { brand: "visa", last4: 1234 } },
      ]),
    },
  ]);
  const out = await paymentMethodList.execute({ customerId: "62459147" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/payment_methods");
  assertEquals(queryOf(calls[0].url), { customer_id: "62459147" });
  assertEquals(out.items.length, 1);
});

Deno.test("payment-method-list: never invents card-number redaction beyond what Recharge already returns", async () => {
  const details = { brand: "visa", exp_month: 12, exp_year: 2030, last4: 1234 };
  const { ctx } = mockCtx([{
    body: listEnvelope("payment_methods", [{ payment_details: details }]),
  }]);
  const out = await paymentMethodList.execute({}, ctx) as {
    items: Array<{ payment_details: Record<string, unknown> }>;
  };
  assert(!("number" in out.items[0].payment_details));
  assertEquals(out.items[0].payment_details, details);
});
