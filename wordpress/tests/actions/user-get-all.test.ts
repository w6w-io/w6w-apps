import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-all.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("user-get-all: GETs /users with defaults (perPage=10, page=1)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wp/v2/users");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("user-get-all: forwards all optional filters with snake_case mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    {
      context: "view",
      orderBy: "name",
      order: "desc",
      search: "al",
      who: "authors",
      perPage: 50,
      page: 2,
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("orderby"), "name");
  assertEquals(params.get("order"), "desc");
  assertEquals(params.get("search"), "al");
  assertEquals(params.get("who"), "authors");
  assertEquals(params.get("per_page"), "50");
  assertEquals(params.get("page"), "2");
});

Deno.test("user-get-all: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("search"));
  assert(!params.has("who"));
});
