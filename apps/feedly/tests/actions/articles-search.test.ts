import { assertEquals } from "@std/assert";
import articlesSearch from "../../actions/articles-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("articles-search: posts the raw query JSON as the body, unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { searchTime: 1, items: [] } }]);
  const query = {
    layers: [{ type: "matches", salience: "about", parts: [{ text: "ransomware" }] }],
    source: { items: [{ type: "stream", id: "enterprise/acme/category/global.all" }] },
  };
  await articlesSearch.execute({ query, count: 25, unreadOnly: true }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/search/contents");
  assertEquals(JSON.parse(calls[0].body!), query);

  const q = queryOf(calls[0].url);
  assertEquals(q.count, "25");
  assertEquals(q.unreadOnly, "true");
});

Deno.test("articles-search: type is search, not read", () => {
  assertEquals(articlesSearch.type, "search");
});
