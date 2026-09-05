import { assertEquals, assertRejects } from "@std/assert";
import bookmarksMove from "../../actions/bookmarks-move.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-move: posts bookmark_id and folder_id, returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "bookmark", bookmark_id: 4, folder_id: 12 }]),
  }]);
  const result = await bookmarksMove.execute({ bookmarkId: 4, folderId: 12 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/move");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "4", folder_id: "12" });
  assertEquals(result, { type: "bookmark", bookmark_id: 4, folder_id: 12 });
});

Deno.test("bookmarks-move: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksMove.execute({ bookmarkId: 4, folderId: 12 }, ctx),
    Error,
    "no bookmark",
  );
});
