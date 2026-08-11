import { assertEquals } from "@std/assert";
import photoCommentCreate from "../../actions/photo-comment-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("photo-comment-create: nests the content and honours the impersonation header", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await photoCommentCreate.execute(
    { photoId: "9", content: "Fixed", actAs: "crew@example.com" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/photos/9/comments");
  assertEquals(bodyOf(calls[0]), { comment: { content: "Fixed" } });
  assertEquals(calls[0].headers["x-companycam-user"], "crew@example.com");
  assertEquals(photoCommentCreate.idempotent, false);
});
