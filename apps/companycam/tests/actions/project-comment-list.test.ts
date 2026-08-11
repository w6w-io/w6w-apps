import { assertEquals } from "@std/assert";
import projectCommentList from "../../actions/project-comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-comment-list: lists project comments", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", content: "Have you seen this yet?", commentable_type: "Project" }],
  }]);
  const page = await projectCommentList.execute({ projectId: "1", page: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/comments");
  assertEquals((page.items[0] as { commentable_type: string }).commentable_type, "Project");
});
