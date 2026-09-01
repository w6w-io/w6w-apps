import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: default call hits GET /v3/contacts with no query", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, email: "a@b.com" }]) }]);
  const out = await contactList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/contacts");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { items: [{ id: 1, email: "a@b.com" }], hasMore: false });
});

Deno.test("contact-list: an exact email lookup is passed through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({ email: "a@b.com", top: 5, skip: 10 }, ctx);

  assertEquals(queryOf(calls[0].url), { email: "a@b.com", top: "5", skip: "10" });
});
