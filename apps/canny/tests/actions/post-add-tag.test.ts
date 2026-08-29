import { assertEquals } from "@std/assert";
import postAddTag from "../../actions/post-add-tag.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-add-tag: posts postID and tagID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await postAddTag.execute({ postID: "p1", tagID: "t1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/add_tag");
  assertEquals(bodyOf(calls[0]), { postID: "p1", tagID: "t1" });
});

Deno.test("post-add-tag: is idempotent", () => {
  assertEquals(postAddTag.idempotent, true);
});
