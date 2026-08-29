import { assertEquals } from "@std/assert";
import commentThreadDelete from "../../actions/comment-thread-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-thread-delete: DELETEs the whole thread and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await commentThreadDelete.execute(
    { socialSetId: 4, draftId: 12, commentThreadId: "t1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12/comment-threads/t1");
  assertEquals(out, { status: 204 });
});
