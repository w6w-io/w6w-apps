import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: hits /contacts and returns {count, results}", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ jnid: "a1" }, { jnid: "a2" }]) }]);
  const out = await contactList.execute({ size: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts");
  assertEquals(queryOf(calls[0].url), { size: "2" });
  assertEquals(out, { count: 2, results: [{ jnid: "a1" }, { jnid: "a2" }] });
});

Deno.test("contact-list: forwards a filter object as URL-encoded JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await contactList.execute({ filter: { must: [{ term: { first_name: "John" } }] } }, ctx);
  assertEquals(queryOf(calls[0].url).filter, '{"must":[{"term":{"first_name":"John"}}]}');
});

Deno.test("contact-list: declares the shared list params", () => {
  const keys = (contactList.params ?? []).map((p) => p.key);
  assertEquals(keys, ["size", "from", "sort_field", "sort_direction", "filter", "actor"]);
});
