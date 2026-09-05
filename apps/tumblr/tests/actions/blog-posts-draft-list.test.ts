import { assertEquals } from "@std/assert";
import blogPostsDraftList from "../../actions/blog-posts-draft-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("blog-posts-draft-list: calls GET /v2/blog/{id}/posts/draft with before_id, not limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ posts: [], total_posts: 0 }) }]);
  await blogPostsDraftList.execute({ blogIdentifier: "staff.tumblr.com", beforeId: 42 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts/draft");
  assertEquals(queryOf(calls[0].url), { before_id: "42" });
});
