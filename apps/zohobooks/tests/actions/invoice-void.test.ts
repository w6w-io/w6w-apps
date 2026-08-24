import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-void.ts";

Deno.test("invoice-void: POSTs /invoices/{id}/status/void", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "invoice has been voided" } }]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/1/status/void");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { code: 0, message: "invoice has been voided" });
});
