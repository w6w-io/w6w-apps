import { assertEquals, assertRejects } from "@std/assert";
import bookmarksUpdateReadProgress from "../../actions/bookmarks-update-read-progress.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-update-read-progress: sends progress and timestamp, returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "bookmark", bookmark_id: 5, progress: 0.5 }]),
  }]);
  const result = await bookmarksUpdateReadProgress.execute(
    { bookmarkId: 5, progress: 0.5, progressTimestamp: 1288584076 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/update_read_progress");
  assertEquals(bodyOf(calls[0]), {
    bookmark_id: "5",
    progress: "0.5",
    progress_timestamp: "1288584076",
  });
  assertEquals(result, { type: "bookmark", bookmark_id: 5, progress: 0.5 });
});

Deno.test("bookmarks-update-read-progress: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () =>
      await bookmarksUpdateReadProgress.execute({
        bookmarkId: 5,
        progress: 0,
        progressTimestamp: 1,
      }, ctx),
    Error,
    "no bookmark",
  );
});

Deno.test("bookmarks-update-read-progress: is marked idempotent", () => {
  assertEquals(bookmarksUpdateReadProgress.idempotent, true);
});
