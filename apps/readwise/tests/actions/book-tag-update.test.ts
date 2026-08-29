import { assertEquals } from "@std/assert";
import bookTagUpdate from "../../actions/book-tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("book-tag-update: PATCHes the tag by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11311390, name: "continental philosophy" } }]);
  await bookTagUpdate.execute(
    { bookId: "59767830", tagId: "11311390", name: "continental philosophy" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/books/59767830/tags/11311390");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "continental philosophy" });
});

Deno.test("book-tag-update: is idempotent", () => {
  assertEquals(bookTagUpdate.idempotent, true);
});
