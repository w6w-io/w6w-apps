import { assertEquals } from "@std/assert";
import commentDelete from "../../actions/comment-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-delete: DELETEs /issue/{key}/comment/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await commentDelete.execute({ issueKey: "ENG-1", commentId: "10" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/comment/10");
});

Deno.test("comment-delete: declared idempotent", () => {
  assertEquals(commentDelete.idempotent, true);
});
