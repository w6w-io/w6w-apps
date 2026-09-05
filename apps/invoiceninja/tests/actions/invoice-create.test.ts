import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs /invoices with client_id and parsed line items", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "inv1" } }]);
  await action.execute(
    {
      clientId: "cl1",
      lineItems: '[{"product_key":"consulting","cost":100,"quantity":2}]',
      number: "INV-0001",
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/invoices");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.client_id, "cl1");
  assertEquals(body.line_items, [{ product_key: "consulting", cost: 100, quantity: 2 }]);
  assertEquals(body.number, "INV-0001");
});

Deno.test("invoice-create: unset line items becomes an empty array", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "inv1" } }]);
  await action.execute({ clientId: "cl1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).line_items, []);
});
