import { assertEquals } from "@std/assert";
import highlightsList from "../../actions/highlights-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlights-list: calls the bookmark-scoped highlights path", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{
      type: "highlight",
      highlight_id: 1,
      bookmark_id: 42,
      text: "x",
      position: 0,
      time: 1,
    }]),
  }]);
  const result = await highlightsList.execute({ bookmarkId: 42 }, ctx) as {
    highlights: Array<{ bookmark_id: number }>;
  };

  assertEquals(pathOf(calls[0].url), "/api/1.1/bookmarks/42/highlights");
  assertEquals(result.highlights.length, 1);
  assertEquals(result.highlights[0].bookmark_id, 42);
});

Deno.test("highlights-list: escapes a bookmark id that isn't a clean integer", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await highlightsList.execute({ bookmarkId: "42/../secrets" as unknown as number }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/1.1/bookmarks/42%2F..%2Fsecrets/highlights");
});
