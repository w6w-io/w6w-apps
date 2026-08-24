import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "7000000079426" } } },
  ]);
  const out = await action.execute({ recordId: "7000000079426" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/7000000079426");
  assertEquals(out, { invoice_id: "7000000079426" });
});
