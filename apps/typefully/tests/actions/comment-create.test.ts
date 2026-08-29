import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: appends a comment to a thread and returns the full thread", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "t1", status: "unresolved", comments: [{ id: "c1", text: "Can we soften this?" }] },
  }]);
  const out = await commentCreate.execute({
    socialSetId: 4,
    draftId: 12,
    commentThreadId: "t1",
    text: "Can we soften this?",
  }, ctx) as { comments: unknown[] };
  assertEquals(
    pathOf(calls[0].url),
    "/v2/social-sets/4/drafts/12/comment-threads/t1/comments",
  );
  assertEquals(JSON.parse(calls[0].body!), { text: "Can we soften this?" });
  assertEquals(out.comments.length, 1);
});
