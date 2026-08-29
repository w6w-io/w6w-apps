import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GETs /contacts, `me` narrows to the requesting user", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "U1", me: true }]) },
  ]);
  const out = await contactList.execute({ me: true }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts");
  assertEquals(queryOf(calls[0].url), { me: "true" });
  assertEquals(out.items, [{ id: "U1", me: true }]);
});

Deno.test("contact-list: types filter is JSON-encoded from a multiselect list", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([]) }]);
  await contactList.execute({ types: ["Person", "Group"] }, ctx);
  assertEquals(queryOf(calls[0].url).types, '["Person","Group"]');
});
