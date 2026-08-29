import { assertEquals } from "@std/assert";
import action from "../../actions/contact-group-list.ts";
import { assertActionRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-group-list: lists groups for a contact book and kind", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_groups: [{ id: "g1" }] } }]);
  const out = await action.execute({ contactBook: "book-1", kind: "group" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contact_groups");
  assertEquals(queryOf(calls[0].url), { contact_book: "book-1", kind: "group" });
  assertEquals(out, [{ id: "g1" }]);
});

Deno.test("contact-group-list: requires contactBook and kind", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ contactBook: "", kind: "group" }, ctx));
  await assertActionRejects(() =>
    action.execute({ contactBook: "b1", kind: undefined as unknown as "group" }, ctx)
  );
});
