import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: wraps each string into a {comment} object", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [{ comment_id: 1 }, { comment_id: 2 }] } }]);
  await commentCreate.execute(
    { projectId: "p1", keyId: 5, comments: ["This is a test.", "Adding multiple comments."] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys/5/comments");
  assertEquals(JSON.parse(calls[0].body!), {
    comments: [{ comment: "This is a test." }, { comment: "Adding multiple comments." }],
  });
});

/**
 * There is no dedupe of any kind on comment text — the strongest of this
 * app's `idempotent: false` declarations, since a retry does not just risk
 * duplication, it guarantees it.
 */
Deno.test("comment-create: is not idempotent — a retry WILL duplicate the comment", () => {
  assertEquals(commentCreate.idempotent, false);
});
