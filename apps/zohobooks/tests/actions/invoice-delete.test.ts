import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-delete.ts";

Deno.test("invoice-delete: DELETEs /invoices/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "invoice deleted" } }]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { code: 0, message: "invoice deleted" });
});
