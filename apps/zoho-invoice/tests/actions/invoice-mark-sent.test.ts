import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-mark-sent.ts";

Deno.test("invoice-mark-sent: POSTs /invoices/{id}/status/sent with no body", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "Invoice status has been changed to Sent." } },
  ]);
  const out = await action.execute({ recordId: "77" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/invoices/77/status/sent");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(out, { code: 0, message: "Invoice status has been changed to Sent." });
});
