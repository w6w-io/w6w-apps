import { assertEquals } from "@std/assert";
import action from "../../actions/contact-book-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-book-list: lists contact books", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_books: [{ id: "b1" }] } }]);
  const out = await action.execute({ limit: 50, offset: 0 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contact_books");
  assertEquals(out, [{ id: "b1" }]);
});
