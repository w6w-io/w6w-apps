import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-get-all.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("post-get-all: GETs /posts with defaults (perPage=10, page=1)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wp/v2/posts");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("post-get-all: forwards all optional filters with proper snake_case mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    {
      context: "view",
      orderBy: "date",
      order: "asc",
      search: "hello",
      after: "2026-01-01T00:00:00Z",
      before: "2026-12-31T23:59:59Z",
      author: [1, 2],
      categories: [3],
      excludedCategories: [4],
      tags: [5],
      excludedTags: [6],
      sticky: true,
      status: "publish",
      perPage: 25,
      page: 2,
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("orderby"), "date");
  assertEquals(params.get("order"), "asc");
  assertEquals(params.get("search"), "hello");
  assertEquals(params.get("author"), "1,2");
  assertEquals(params.get("categories"), "3");
  assertEquals(params.get("categories_exclude"), "4");
  assertEquals(params.get("tags"), "5");
  assertEquals(params.get("tags_exclude"), "6");
  assertEquals(params.get("sticky"), "true");
  assertEquals(params.get("status"), "publish");
  assertEquals(params.get("per_page"), "25");
  assertEquals(params.get("page"), "2");
});

Deno.test("post-get-all: omits filters left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("search"));
  assert(!params.has("author"));
  assert(!params.has("status"));
});
