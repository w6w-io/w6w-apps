import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get-all.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("page-get-all: GETs /pages with defaults (perPage=10, page=1)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wp/v2/pages");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("page-get-all: forwards all optional filters with snake_case mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    {
      context: "view",
      orderBy: "date",
      order: "asc",
      search: "hi",
      after: "2026-01-01T00:00:00Z",
      before: "2026-12-31T00:00:00Z",
      author: [1],
      parent: 9,
      menuOrder: 2,
      status: "publish",
      perPage: 25,
      page: 3,
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("orderby"), "date");
  assertEquals(params.get("order"), "asc");
  assertEquals(params.get("search"), "hi");
  assertEquals(params.get("author"), "1");
  assertEquals(params.get("parent"), "9");
  assertEquals(params.get("menu_order"), "2");
  assertEquals(params.get("status"), "publish");
  assertEquals(params.get("per_page"), "25");
  assertEquals(params.get("page"), "3");
});

Deno.test("page-get-all: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("search"));
  assert(!params.has("parent"));
});
