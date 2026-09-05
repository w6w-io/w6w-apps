import { assertEquals, assertRejects } from "@std/assert";
import bookmarksArchive from "../../actions/bookmarks-archive.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-archive: posts bookmark_id and returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 4 }]) }]);
  const result = await bookmarksArchive.execute({ bookmarkId: 4 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/archive");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "4" });
  assertEquals(result, { type: "bookmark", bookmark_id: 4 });
});

Deno.test("bookmarks-archive: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksArchive.execute({ bookmarkId: 4 }, ctx),
    Error,
    "no bookmark",
  );
});
