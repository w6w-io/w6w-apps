import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-update.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("post-update: POSTs /posts/{id} with the parsed numeric id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }], { display });
  await action.execute!({ postId: "42", title: "New" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/posts/42");
  assertEquals(JSON.parse(calls[0].body!), { id: 42, title: "New" });
});

Deno.test("post-update: only sends fields the caller explicitly provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ postId: "42", status: "draft" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: 42, status: "draft" });
});

Deno.test("post-update: maps all optional camelCase fields to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!(
    {
      postId: "7",
      authorId: 3,
      commentStatus: "open",
      pingStatus: "closed",
      categories: [1],
      tags: [2],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    id: 7,
    author: 3,
    comment_status: "open",
    ping_status: "closed",
    categories: [1],
    tags: [2],
  });
});
