import { assertEquals } from "@std/assert";
import bookTagGet from "../../actions/book-tag-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("book-tag-get: reads one tag, no trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11311390, name: "philosophy" } }]);
  const out = await bookTagGet.execute({ bookId: "59767830", tagId: "11311390" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/books/59767830/tags/11311390");
  assertEquals(out, { id: 11311390, name: "philosophy" });
});
