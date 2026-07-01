import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-create.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("post-create: POSTs /posts with only the required title", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  const result = await action.execute!({ title: "Hello" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/posts");
  assertEquals(JSON.parse(calls[0].body!), { title: "Hello" });
  assertEquals(result, { id: 1 });
});

Deno.test("post-create: maps camelCase optional inputs to snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }], { display });
  await action.execute!(
    {
      title: "T",
      authorId: 42,
      content: "body",
      slug: "s",
      password: "p",
      status: "publish",
      commentStatus: "closed",
      pingStatus: "open",
      sticky: true,
      template: "elementor_canvas",
      categories: [1, 2],
      tags: [7],
      format: "aside",
      date: "2026-01-01T00:00:00Z",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    title: "T",
    author: 42,
    content: "body",
    slug: "s",
    password: "p",
    status: "publish",
    comment_status: "closed",
    ping_status: "open",
    sticky: true,
    template: "elementor_canvas",
    categories: [1, 2],
    tags: [7],
    format: "aside",
    date: "2026-01-01T00:00:00Z",
  });
});
