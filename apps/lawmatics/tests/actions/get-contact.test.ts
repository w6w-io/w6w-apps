import { assertEquals } from "@std/assert";
import getContact from "../../actions/get-contact.ts";
import { item, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-contact: hits GET /v1/contacts/:id and unwraps the single-resource envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: item("136", "contact", { first_name: "Linda", last_name: "Baker" }),
  }]);
  const out = await getContact.execute({ contactId: "136" }, ctx) as { id: string; type: string };

  assertEquals(pathOf(calls[0].url), "/v1/contacts/136");
  assertEquals(out.id, "136");
  assertEquals(out.type, "contact");
});

Deno.test("get-contact: URL-encodes the id and forwards fields", async () => {
  const { ctx, calls } = mockCtx([{ body: item("a b", "contact", {}) }]);
  await getContact.execute({ contactId: "a b", fields: "all" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts/a%20b");
  assertEquals(queryOf(calls[0].url), { fields: "all" });
});
