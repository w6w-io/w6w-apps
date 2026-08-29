import { assertEquals } from "@std/assert";
import commentDelete from "../../actions/comment-delete.ts";
import { mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-delete: DELETEs /comments/{commentId}", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: {} }]);
  const out = await commentDelete.execute({ commentId: "C1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v4/comments/C1");
  assertEquals(out.status, 200);
});
