import { assertEquals } from "@std/assert";
import commentDelete from "../../actions/comment-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("comment-delete: posts commentID, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await commentDelete.execute({ commentID: "cm1" }, ctx) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/comments/delete");
  assertEquals(bodyOf(calls[0]), { commentID: "cm1" });
  assertEquals(out.message, "success");
});
