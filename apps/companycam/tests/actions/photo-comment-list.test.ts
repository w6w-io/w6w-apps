import { assertEquals } from "@std/assert";
import photoCommentList from "../../actions/photo-comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("photo-comment-list: lists a photo's comments", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", content: "Looks good", commentable_type: "Photo" }],
  }]);
  const page = await photoCommentList.execute({ photoId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/9/comments");
  assertEquals((page.items[0] as { commentable_type: string }).commentable_type, "Photo");
});
