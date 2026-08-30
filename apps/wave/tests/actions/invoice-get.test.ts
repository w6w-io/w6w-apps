import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import invoiceGet from "../../actions/invoice-get.ts";

Deno.test("invoice-get: returns the invoice by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { invoice: { id: "i1", invoiceNumber: "INV-001" } } } },
  }]);
  const out = await invoiceGet.execute({ businessId: "b1", invoiceId: "i1" }, ctx) as {
    invoiceNumber: string;
  };
  assertEquals(out.invoiceNumber, "INV-001");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.invoiceId, "i1");
});

Deno.test("invoice-get: type/resource metadata", () => {
  assertEquals(invoiceGet.type, "read");
  assertEquals(invoiceGet.resource, "invoice");
});
