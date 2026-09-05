import { assertEquals } from "@std/assert";
import blogPostsSubmissionList from "../../actions/blog-posts-submission-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("blog-posts-submission-list: calls GET /v2/blog/{id}/posts/submission with offset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ posts: [] }) }]);
  await blogPostsSubmissionList.execute({ blogIdentifier: "staff.tumblr.com", offset: 3 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts/submission");
  assertEquals(queryOf(calls[0].url), { offset: "3" });
});
