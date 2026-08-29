import { assertEquals } from "@std/assert";
import contactsUpdate from "../../actions/contacts-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contacts-update: PATCHes /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await contactsUpdate.execute({ contactId: "1", jobTitle: "Engineer" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/1");
  assertEquals(JSON.parse(calls[0].body!).job_title, "Engineer");
});

Deno.test("contacts-update: declared idempotent", () => {
  assertEquals(contactsUpdate.idempotent, true);
});
