import { assertEquals } from "@std/assert";
import bookmarksList from "../../actions/bookmarks-list.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-list: maps camelCase input to Instapaper's snake_case body fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      user: { type: "user", user_id: 1, username: "a" },
      bookmarks: [{ type: "bookmark", bookmark_id: 5, url: "https://example.com" }],
      highlights: [],
      delete_ids: [],
    },
  }]);
  const result = await bookmarksList.execute(
    { limit: 10, folderId: "unread", tag: "reading", have: "1,2", highlights: "3-4" },
    ctx,
  ) as { user: unknown; bookmarks: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/list");
  assertEquals(bodyOf(calls[0]), {
    limit: "10",
    folder_id: "unread",
    tag: "reading",
    have: "1,2",
    highlights: "3-4",
  });
  assertEquals(result.bookmarks, [{
    type: "bookmark",
    bookmark_id: 5,
    url: "https://example.com",
  }]);
  assertEquals(result.user, { type: "user", user_id: 1, username: "a" });
});

Deno.test("bookmarks-list: defaults missing arrays to empty rather than undefined", async () => {
  const { ctx } = mockCtx([{ body: { bookmarks: [] } }]);
  const result = await bookmarksList.execute({}, ctx);
  assertEquals(result, { user: null, bookmarks: [], highlights: [], delete_ids: [] });
});
