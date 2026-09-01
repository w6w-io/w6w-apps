import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-void.ts";

Deno.test("invoice-void: POSTs /invoices/{id}/status/void", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "Invoice status has been changed to Void." } },
  ]);
  const out = await action.execute({ recordId: "77" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/invoices/77/status/void");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { code: 0, message: "Invoice status has been changed to Void." });
});
