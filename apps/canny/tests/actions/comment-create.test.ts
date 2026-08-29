import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("comment-create: posts to /v1/comments/create", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cm1" } }]);
  const out = await commentCreate.execute(
    { authorID: "u1", postID: "p1", value: "Great idea!" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/comments/create");
  assertEquals(bodyOf(calls[0]), { authorID: "u1", postID: "p1", value: "Great idea!" });
  assertEquals(out.id, "cm1");
});

Deno.test("comment-create: is not idempotent", () => {
  assertEquals(commentCreate.idempotent, false);
});
