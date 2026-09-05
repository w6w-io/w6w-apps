import { assertEquals, assertRejects } from "@std/assert";
import bookmarksUnstar from "../../actions/bookmarks-unstar.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-unstar: posts bookmark_id and returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "bookmark", bookmark_id: 3, starred: "0" }]),
  }]);
  const result = await bookmarksUnstar.execute({ bookmarkId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/unstar");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "3" });
  assertEquals(result, { type: "bookmark", bookmark_id: 3, starred: "0" });
});

Deno.test("bookmarks-unstar: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksUnstar.execute({ bookmarkId: 3 }, ctx),
    Error,
    "no bookmark",
  );
});
