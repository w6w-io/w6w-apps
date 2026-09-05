import { assert, assertEquals } from "@std/assert";
import listSetContacts from "../../actions/list-set-contacts.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-set-contacts: POSTs to /lists/{id}/contacts with the raw contacts string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 715, href: "/api/v2/lists/715" } }]);
  const out = await listSetContacts.execute({ id: 715, contacts: "1,2,3" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lists/715/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contacts: "1,2,3" });
  assertEquals(out, { id: 715, href: "/api/v2/lists/715" });
});

Deno.test('list-set-contacts: accepts the literal "all"', async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 715, href: "/api/v2/lists/715" } }]);
  await listSetContacts.execute({ id: 715, contacts: "all" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contacts: "all" });
});

/**
 * `clearAndAssignContactsToList` REPLACES membership rather than adding to it
 * — the title and description are the one place a caller reading params alone
 * (without opening this file) sees that warning, so pin that they say it.
 */
Deno.test("list-set-contacts: the title and description both say this replaces membership", () => {
  assert(/replace/i.test(listSetContacts.title));
  assert(/remov/i.test(listSetContacts.description ?? ""));
});
