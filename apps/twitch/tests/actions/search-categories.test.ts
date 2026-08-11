import { assertEquals } from "@std/assert";
import searchCategories from "../../actions/search-categories.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-categories: calls GET /helix/search/categories", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "33214", name: "Fortnite" }]) }]);
  const out = await searchCategories.execute({ query: "fort" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/helix/search/categories");
  assertEquals(queryOf(calls[0].url), { query: "fort" });
  assertEquals(out.data.length, 1);
});

/**
 * Twitch's examples show the query URI-encoded because they are shell examples.
 * Encoding it a second time here would turn `#archery` into `%2523archery` and
 * match nothing.
 */
Deno.test("search-categories: the query is encoded exactly once", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await searchCategories.execute({ query: "#archery & love computer" }, ctx);

  assertEquals(queryOf(calls[0].url).query, "#archery & love computer");
  assertEquals(calls[0].url.includes("%2523"), false, "double-encoded the query");
});
