import { assertEquals } from "@std/assert";
import postGet from "../../actions/post-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("post-get: calls GET /v2/blog/{id}/posts/{post-id} with post_format=npf by default", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "123", type: "blocks" }) }]);
  const out = await postGet.execute(
    { blogIdentifier: "staff.tumblr.com", postId: "123", postFormat: "npf" },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts/123");
  assertEquals(queryOf(calls[0].url), { post_format: "npf" });
  assertEquals(out.id, "123");
});
