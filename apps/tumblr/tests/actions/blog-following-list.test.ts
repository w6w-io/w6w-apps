import { assertEquals } from "@std/assert";
import blogFollowingList from "../../actions/blog-following-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("blog-following-list: calls GET /v2/blog/{id}/following", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ blogs: [{ name: "a" }], total_blogs: 1 }) },
  ]);
  const out = await blogFollowingList.execute(
    { blogIdentifier: "staff.tumblr.com", limit: 10 },
    ctx,
  ) as { total_blogs: number };

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/following");
  assertEquals(out.total_blogs, 1);
});
