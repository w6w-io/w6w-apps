import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: builds the filter query and hits /api/contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, email: "a@b.com" }]) }]);
  const out = await contactList.execute(
    { email: "a@b.com", tags: "1,2,3", bounced: false, limit: 25, order: "asc" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(
    queryOf(calls[0].url),
    { email: "a@b.com", tags: "1,2,3", bounced: "false", limit: "25", order: "asc" },
  );
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("contact-list: an empty input sends no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
