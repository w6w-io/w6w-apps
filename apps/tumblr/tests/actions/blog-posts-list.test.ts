import { assertEquals } from "@std/assert";
import blogPostsList from "../../actions/blog-posts-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("blog-posts-list: calls GET /v2/blog/{id}/posts with type/tag/npf query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ blog: { name: "staff" }, posts: [], total_posts: 0 }) },
  ]);
  await blogPostsList.execute(
    { blogIdentifier: "staff.tumblr.com", type: "photo", tag: "yankees", npf: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts");
  assertEquals(queryOf(calls[0].url), { type: "photo", tag: "yankees", npf: "true" });
});

Deno.test("blog-posts-list: boolean flags are omitted, not sent as false, when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ posts: [] }) }]);
  await blogPostsList.execute({ blogIdentifier: "staff.tumblr.com" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
