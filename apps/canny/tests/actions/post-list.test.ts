import { assertEquals } from "@std/assert";
import postList from "../../actions/post-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-list: posts filters to /v1/posts/list, normalising tagIDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [], hasMore: false } }]);
  await postList.execute(
    { boardID: "b1", tagIDs: "t1, t2", search: "dark mode", sort: "relevance", limit: 20 },
    ctx,
  );

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/list");
  assertEquals(bodyOf(calls[0]), {
    boardID: "b1",
    tagIDs: ["t1", "t2"],
    search: "dark mode",
    sort: "relevance",
    limit: 20,
  });
});

Deno.test("post-list: an array of tagIDs is passed through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [] } }]);
  await postList.execute({ tagIDs: ["t1", "t2"] }, ctx);

  assertEquals(bodyOf(calls[0]), { tagIDs: ["t1", "t2"] });
});
