import { assertEquals } from "@std/assert";
import blogLikesList from "../../actions/blog-likes-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("blog-likes-list: calls GET /v2/blog/{id}/likes with query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ liked_posts: [{ id: 1 }], liked_count: 1 }) },
  ]);
  const out = await blogLikesList.execute(
    { blogIdentifier: "staff.tumblr.com", limit: 5, before: 1000 },
    ctx,
  ) as { liked_count: number };

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/likes");
  assertEquals(queryOf(calls[0].url), { limit: "5", before: "1000" });
  assertEquals(out.liked_count, 1);
});

Deno.test("blog-likes-list: omits unset offset/before/after", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ liked_posts: [], liked_count: 0 }) }]);
  await blogLikesList.execute({ blogIdentifier: "staff.tumblr.com" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
