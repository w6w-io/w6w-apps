import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: GETs /invoices and passes customer/status filters through", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", invoices: [{ invoice_id: "1" }] } },
  ]);
  const out = await action.execute({ customerId: "cust-1", status: "overdue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/invoices");
  assertEquals(url.searchParams.get("customer_id"), "cust-1");
  assertEquals(url.searchParams.get("status"), "overdue");
  assertEquals(out.data, [{ invoice_id: "1" }]);
});
