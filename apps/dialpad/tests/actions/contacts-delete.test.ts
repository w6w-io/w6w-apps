import { assertEquals } from "@std/assert";
import contactsDelete from "../../actions/contacts-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contacts-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await contactsDelete.execute({ contactId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/1");
});

Deno.test("contacts-delete: declared idempotent", () => {
  assertEquals(contactsDelete.idempotent, true);
});
