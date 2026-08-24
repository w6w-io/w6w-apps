import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: PUTs /invoices/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "1" } } },
  ]);
  await action.execute({ recordId: "1", fields: { reference_number: "PO-42" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { reference_number: "PO-42" });
});
