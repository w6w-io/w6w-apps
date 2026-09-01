import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs the fields to /invoices", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "77" } } },
  ]);
  await action.execute({ fields: { customer_id: "cust-1" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/invoices");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { customer_id: "cust-1" });
});
