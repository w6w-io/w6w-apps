import { assertEquals } from "@std/assert";
import commentThreadResolve from "../../actions/comment-thread-resolve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-thread-resolve: POSTs to the resolve sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", status: "resolved", comments: [] } }]);
  const out = await commentThreadResolve.execute(
    { socialSetId: 4, draftId: 12, commentThreadId: "t1" },
    ctx,
  ) as { status: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/social-sets/4/drafts/12/comment-threads/t1/resolve",
  );
  assertEquals(out.status, "resolved");
});

Deno.test("comment-thread-resolve: idempotent — resolving twice is a no-op", () => {
  assertEquals(commentThreadResolve.idempotent, true);
});
