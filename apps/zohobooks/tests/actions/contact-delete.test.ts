import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "contact deleted" } }]);
  const out = await action.execute({ recordId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/contacts/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out, { code: 0, message: "contact deleted" });
});
