import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: GETs /invoices with customer/status filters", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", invoices: [{ invoice_id: "1" }] } },
  ]);
  const out = await action.execute({ customerId: "555", status: "overdue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/invoices");
  assertEquals(url.searchParams.get("customer_id"), "555");
  assertEquals(url.searchParams.get("status"), "overdue");
  assertEquals(out.data, [{ invoice_id: "1" }]);
});
