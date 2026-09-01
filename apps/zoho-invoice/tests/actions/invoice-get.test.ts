import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "77" } } },
  ]);
  const out = await action.execute({ recordId: "77" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/invoices/77");
  assertEquals(out, { invoice_id: "77" });
});
