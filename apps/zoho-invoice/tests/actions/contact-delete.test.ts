import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "The contact has been deleted." } },
  ]);
  const out = await action.execute({ recordId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/contacts/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { code: 0, message: "The contact has been deleted." });
});
