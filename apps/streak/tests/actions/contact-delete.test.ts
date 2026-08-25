import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs the contact", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await contactDelete.execute({ contactKey: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
  assertEquals(out, { success: true });
});
