import { assertEquals, assertRejects } from "@std/assert";
import bookmarksUnarchive from "../../actions/bookmarks-unarchive.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-unarchive: posts bookmark_id and returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 4 }]) }]);
  const result = await bookmarksUnarchive.execute({ bookmarkId: 4 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/unarchive");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "4" });
  assertEquals(result, { type: "bookmark", bookmark_id: 4 });
});

Deno.test("bookmarks-unarchive: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksUnarchive.execute({ bookmarkId: 4 }, ctx),
    Error,
    "no bookmark",
  );
});
