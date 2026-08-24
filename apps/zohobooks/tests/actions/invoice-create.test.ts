import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs /invoices with customer_id and line_items", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "1" } } },
  ]);
  const fields = {
    customer_id: "460000000123456",
    line_items: [{ item_id: "460000000234567", quantity: 2 }],
  };
  await action.execute({ fields }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), fields);
});
