import { assertEquals } from "@std/assert";
import bookTagList from "../../actions/book-tag-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("book-tag-list: GETs the tag collection without a trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "philosophy" }]) }]);
  const out = await bookTagList.execute({ bookId: "59767830" }, ctx) as { count: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/books/59767830/tags");
  assertEquals(out.count, 1);
});
