import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-create.ts";

Deno.test("payment-create: POSTs /payments with client_id, amount and applied invoices", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute(
    { clientId: "cl1", amount: 100, invoices: '[{"invoice_id":"inv1","amount":"100"}]' },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/payments");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.client_id, "cl1");
  assertEquals(body.amount, 100);
  assertEquals(body.invoices, [{ invoice_id: "inv1", amount: "100" }]);
});

Deno.test("payment-create: an unapplied payment omits invoices", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute({ clientId: "cl1", amount: 50 }, ctx);
  assertEquals("invoices" in JSON.parse(calls[0].body!), false);
});
