import { assertEquals } from "@std/assert";
import contactsGet from "../../actions/contacts-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contacts-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await contactsGet.execute({ contactId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/1");
});
