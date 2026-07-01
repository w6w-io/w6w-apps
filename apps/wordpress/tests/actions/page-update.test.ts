import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-update.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("page-update: POSTs /pages/{id} with the parsed numeric id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ pageId: "5", title: "New" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/pages/5");
  assertEquals(JSON.parse(calls[0].body!), { id: 5, title: "New" });
});

Deno.test("page-update: only sends the fields the caller supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ pageId: "5", status: "draft" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: 5, status: "draft" });
});

Deno.test("page-update: maps optional camelCase fields to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!(
    {
      pageId: "5",
      authorId: 1,
      commentStatus: "open",
      pingStatus: "closed",
      menuOrder: 2,
      featuredMediaId: 33,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    id: 5,
    author: 1,
    comment_status: "open",
    ping_status: "closed",
    menu_order: 2,
    featured_media: 33,
  });
});
