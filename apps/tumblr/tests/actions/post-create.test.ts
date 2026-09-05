import { assertEquals } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-create: posts NPF content and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "123" }) }]);
  const out = await postCreate.execute(
    {
      blogIdentifier: "staff.tumblr.com",
      content: [{ type: "text", text: "hello" }],
      tags: "a,b",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/posts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, [{ type: "text", text: "hello" }]);
  assertEquals(body.tags, "a,b");
  assertEquals("parent_tumblelog_uuid" in body, false);
  assertEquals(out.id, "123");
});

Deno.test("post-create: accepts content as a JSON string (the shape a form posts)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "1" }) }]);
  await postCreate.execute(
    { blogIdentifier: "staff.tumblr.com", content: JSON.stringify([{ type: "text", text: "hi" }]) },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, [{ type: "text", text: "hi" }]);
});

Deno.test("post-create: sending all three reblog fields includes them in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "2" }) }]);
  await postCreate.execute(
    {
      blogIdentifier: "staff.tumblr.com",
      content: [],
      parentTumblelogUuid: "t:abc",
      parentPostId: 999,
      reblogKey: "rk",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.parent_tumblelog_uuid, "t:abc");
  assertEquals(body.parent_post_id, 999);
  assertEquals(body.reblog_key, "rk");
});

Deno.test("post-create: rejects invalid JSON in content with a clear error", async () => {
  const { ctx } = mockCtx([]);
  try {
    await postCreate.execute({ blogIdentifier: "staff.tumblr.com", content: "{not json" }, ctx);
    throw new Error("expected to throw");
  } catch (err) {
    assertEquals((err as Error).message, "content is not valid JSON");
  }
});
