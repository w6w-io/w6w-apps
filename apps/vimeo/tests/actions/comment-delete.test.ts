import { assertEquals, assertRejects } from "@std/assert";
import commentDelete from "../../actions/comment-delete.ts";
import { errorBody, mockCtx, url } from "../_helpers.ts";

Deno.test("comment-delete: DELETEs /videos/{id}/comments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await commentDelete.execute({ videoId: "/videos/1", commentId: "12345" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/videos/1/comments/12345");
  assertEquals(out, { deleted: true, videoId: "1", commentId: "12345" });
});

/**
 * Vimeo's own response table says a 404 here can mean error code 5000, "the
 * comment wasn't deleted and still exists" — so a 404 must surface as an error
 * rather than be swallowed as the reassuring already-gone kind.
 */
Deno.test("comment-delete: a 404 surfaces rather than reading as already deleted", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody(5000, "The comment wasn't deleted and still exists.") },
  ]);
  const err = await assertRejects(
    async () => await commentDelete.execute({ videoId: "1", commentId: "2" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("still exists"), true);
});

Deno.test("comment-delete: is a retry-safe perform", () => {
  assertEquals(commentDelete.type, "perform");
  assertEquals(commentDelete.idempotent, true);
});
