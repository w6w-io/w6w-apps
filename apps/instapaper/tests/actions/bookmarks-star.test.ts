import { assertEquals, assertRejects } from "@std/assert";
import bookmarksStar from "../../actions/bookmarks-star.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-star: posts bookmark_id and returns the modified bookmark", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "bookmark", bookmark_id: 3, starred: "1" }]),
  }]);
  const result = await bookmarksStar.execute({ bookmarkId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/star");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "3" });
  assertEquals(result, { type: "bookmark", bookmark_id: 3, starred: "1" });
});

Deno.test("bookmarks-star: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksStar.execute({ bookmarkId: 3 }, ctx),
    Error,
    "no bookmark",
  );
});
