import { assertEquals } from "@std/assert";
import postChangeCategory from "../../actions/post-change-category.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-change-category: reassigns a category", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", category: { id: "c1" } } }]);
  await postChangeCategory.execute({ postID: "p1", categoryID: "c1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/change_category");
  assertEquals(bodyOf(calls[0]), { postID: "p1", categoryID: "c1" });
});

Deno.test('post-change-category: passes the literal string "null" through unchanged to clear it', async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", category: null } }]);
  await postChangeCategory.execute({ postID: "p1", categoryID: "null" }, ctx);

  assertEquals(bodyOf(calls[0]), { postID: "p1", categoryID: "null" });
});
