import { assertEquals } from "@std/assert";
import postDelete from "../../actions/post-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-delete: posts postID and unwraps the confirmation string", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await postDelete.execute({ postID: "p1" }, ctx) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/delete");
  assertEquals(bodyOf(calls[0]), { postID: "p1" });
  assertEquals(out.message, "success");
});

Deno.test("post-delete: is idempotent", () => {
  assertEquals(postDelete.idempotent, true);
});
