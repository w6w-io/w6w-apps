import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { assertActionRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: queries by contact book with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1" }] } }]);
  const out = await action.execute({ contactBook: "book-1", limit: 50, offset: 0 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), { contact_book: "book-1", limit: "50", offset: "0" });
  assertEquals(out, [{ id: "c1" }]);
});

Deno.test("contact-list: passes search and includeDeleted through", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute(
    { contactBook: "book-1", search: "phil", includeDeleted: true, modifiedSince: 100 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).search, "phil");
  assertEquals(queryOf(calls[0].url).include_deleted, "true");
  assertEquals(queryOf(calls[0].url).modified_since, "100");
});

Deno.test("contact-list: requires contactBook", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ contactBook: "" }, ctx));
});
