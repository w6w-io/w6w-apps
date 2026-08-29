import { assertEquals } from "@std/assert";
import postRemoveTag from "../../actions/post-remove-tag.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-remove-tag: posts postID and tagID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await postRemoveTag.execute({ postID: "p1", tagID: "t1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/remove_tag");
  assertEquals(bodyOf(calls[0]), { postID: "p1", tagID: "t1" });
});

Deno.test("post-remove-tag: is idempotent", () => {
  assertEquals(postRemoveTag.idempotent, true);
});
