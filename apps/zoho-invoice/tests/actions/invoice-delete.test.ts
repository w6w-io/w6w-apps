import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-delete.ts";

Deno.test("invoice-delete: DELETEs /invoices/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "The invoice has been deleted." } },
  ]);
  const out = await action.execute({ recordId: "77" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/invoices/77");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { code: 0, message: "The invoice has been deleted." });
});
