import { assertEquals } from "@std/assert";
import postUpdate from "../../actions/post-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-update: PUTs NPF content to /v2/blog/{id}/posts/{post-id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "123" }) }]);
  const out = await postUpdate.execute(
    {
      blogIdentifier: "staff.tumblr.com",
      postId: "123",
      content: [{ type: "text", text: "edited" }],
      publishOn: "2026-09-05T00:00:00Z",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts/123");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, [{ type: "text", text: "edited" }]);
  assertEquals(body.publish_on, "2026-09-05T00:00:00Z");
  assertEquals(out.id, "123");
});
