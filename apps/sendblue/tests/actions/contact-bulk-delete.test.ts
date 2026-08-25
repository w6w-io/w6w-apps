import { assertEquals } from "@std/assert";
import contactBulkDelete from "../../actions/contact-bulk-delete.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-bulk-delete: DELETEs /api/v2/contacts with contact_ids as phone numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", amount: 2 } }]);
  await contactBulkDelete.execute({ contactIds: ["+1", "+2"] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(jsonBodyOf(calls[0]), { contact_ids: ["+1", "+2"] });
});
