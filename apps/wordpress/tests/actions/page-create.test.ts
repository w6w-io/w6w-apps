import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-create.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("page-create: POSTs /pages with only the required title", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  await action.execute!({ title: "About" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/pages");
  assertEquals(JSON.parse(calls[0].body!), { title: "About" });
});

Deno.test("page-create: maps camelCase optional inputs to snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!(
    {
      title: "T",
      authorId: 1,
      content: "c",
      slug: "s",
      password: "p",
      status: "publish",
      commentStatus: "closed",
      pingStatus: "open",
      template: "elementor_canvas",
      menuOrder: 5,
      parent: 2,
      featuredMediaId: 33,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    title: "T",
    author: 1,
    content: "c",
    slug: "s",
    password: "p",
    status: "publish",
    comment_status: "closed",
    ping_status: "open",
    template: "elementor_canvas",
    menu_order: 5,
    parent: 2,
    featured_media: 33,
  });
});
