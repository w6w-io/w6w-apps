import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-mark-sent.ts";

Deno.test("invoice-mark-sent: POSTs /invoices/{id}/status/sent", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "invoice marked as sent" } }]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/1/status/sent");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { code: 0, message: "invoice marked as sent" });
});
