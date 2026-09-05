import { assertEquals } from "@std/assert";
import blogPostsQueueList from "../../actions/blog-posts-queue-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("blog-posts-queue-list: calls GET /v2/blog/{id}/posts/queue", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ posts: [], total_posts: 0 }) }]);
  await blogPostsQueueList.execute({ blogIdentifier: "staff.tumblr.com", limit: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts/queue");
});
