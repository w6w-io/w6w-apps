import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "inv1", number: "INV-0001" } }]);
  const out = await action.execute({ invoiceId: "inv1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/invoices/inv1");
  assertEquals(out, { id: "inv1", number: "INV-0001" });
});
