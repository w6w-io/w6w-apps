import { assertEquals } from "@std/assert";
import commentList from "../../actions/comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-list: lists project-wide comments (not scoped to one key)", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [{ comment_id: 1 }] } }]);
  const out = await commentList.execute({ projectId: "p1", limit: 50 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/comments");
  assertEquals(out.items, [{ comment_id: 1 }]);
});
